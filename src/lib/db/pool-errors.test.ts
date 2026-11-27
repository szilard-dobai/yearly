// @vitest-environment node
import { once } from 'node:events'
import {
  createServer,
  type AddressInfo,
  type Server,
  type Socket,
} from 'node:net'
import { Pool } from 'pg'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handlePoolErrors } from './pool-errors'

function message(type: string, body: Buffer) {
  const header = Buffer.alloc(5)
  header.write(type, 0)
  header.writeInt32BE(body.length + 4, 1)
  return Buffer.concat([header, body])
}

function errorResponse(code: string, text: string) {
  const fields = Object.entries({ S: 'FATAL', V: 'FATAL', C: code, M: text })
  return message(
    'E',
    Buffer.concat([
      ...fields.map(([key, value]) => Buffer.from(`${key}${value}\0`)),
      Buffer.from([0]),
    ])
  )
}

const HANDSHAKE = Buffer.concat([
  message('R', Buffer.from([0, 0, 0, 0])),
  message('Z', Buffer.from('I')),
])

function startFakePostgres(sockets: Socket[]) {
  return createServer((socket) => {
    sockets.push(socket)
    let started = false
    socket.on('data', (data) => {
      if (!started) {
        started = true
        socket.write(HANDSHAKE)
      } else if (data.toString('latin1', 0, 1) === 'Q') {
        socket.destroy()
      }
    })
  }).listen(0, '127.0.0.1')
}

describe('handlePoolErrors', () => {
  let server: Server
  let sockets: Socket[]
  let pool: Pool
  let warn: ReturnType<typeof vi.spyOn>
  let error: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    sockets = []
    server = startFakePostgres(sockets)
    await once(server, 'listening')
    pool = new Pool({
      host: '127.0.0.1',
      port: (server.address() as AddressInfo).port,
      user: 'test',
      database: 'test',
      ssl: false,
    })
    handlePoolErrors(pool)
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    error = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await pool.end()
    sockets.forEach((socket) => socket.destroy())
    await new Promise((resolve) => server.close(resolve))
    vi.restoreAllMocks()
  })

  it('keeps the server running when Postgres closes an idle connection', async () => {
    const client = await pool.connect()
    client.release()

    sockets[0].destroy()

    await vi.waitFor(() => expect(pool.totalCount).toBe(0))
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Postgres closed an idle connection: Connection terminated unexpectedly'
    )
    expect(error).not.toHaveBeenCalled()

    const next = await pool.connect()
    next.release()
    expect(sockets).toHaveLength(2)
  })

  it('treats Neon shutting the connection down as a dropped connection', async () => {
    const client = await pool.connect()
    client.release()

    sockets[0].end(
      errorResponse(
        '57P01',
        'terminating connection due to administrator command'
      )
    )

    await vi.waitFor(() => expect(pool.totalCount).toBe(0))
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Postgres closed an idle connection: 57P01'
    )
    expect(error).not.toHaveBeenCalled()
  })

  it('logs any other idle connection error as an error, so Sentry reports it', async () => {
    const client = await pool.connect()
    client.release()

    sockets[0].end(errorResponse('XX000', 'internal error'))

    await vi.waitFor(() => expect(pool.totalCount).toBe(0))
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'Postgres idle connection failed:',
      expect.objectContaining({ code: 'XX000', message: 'internal error' })
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('fails the running query rather than the server when a checked-out connection drops', async () => {
    const client = await pool.connect()

    await expect(client.query('select 1')).rejects.toThrow(
      'Connection terminated unexpectedly'
    )
    client.release()

    await vi.waitFor(() => expect(pool.totalCount).toBe(0))
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('fails the next query when a checked-out connection drops between queries', async () => {
    const client = await pool.connect()
    const ended = new Promise((resolve) => client.once('end', resolve))

    sockets[0].destroy()
    await ended

    await expect(client.query('select 1')).rejects.toThrow('not queryable')
    client.release()
  })
})
