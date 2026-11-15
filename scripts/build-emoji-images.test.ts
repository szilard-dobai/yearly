// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { treatColour, treatSvgColours } from './build-emoji-images.mjs'

describe('treatColour', () => {
  it.each([
    [
      [0xed, 0x29, 0x39],
      [207, 56, 68],
    ],
    [
      [0xff, 0xff, 0xff],
      [250, 250, 250],
    ],
    [
      [0x00, 0x23, 0x95],
      [16, 43, 131],
    ],
    [
      [0x00, 0x00, 0x00],
      [10, 10, 10],
    ],
    [
      [0xff, 0xce, 0x00],
      [241, 203, 44],
    ],
    [
      [0x80, 0x80, 0x80],
      [131, 131, 131],
    ],
  ] as const)(
    'turns %j into %j, as Chrome draws it with the CSS filter',
    (input, output) => {
      expect(treatColour([...input])).toEqual(output)
    }
  )
})

describe('treatSvgColours', () => {
  it('rewrites colours in attributes, style attributes and style blocks', () => {
    const svg = treatSvgColours(
      '<svg fill="none"><style>.a{fill:#fff;stroke:rgb(0, 35, 149)}</style><path fill="#ED2939" style="stroke:#000;opacity:0.2"/></svg>',
      'test.svg'
    )

    expect(svg).toContain('<style>.a{fill:#fafafa;stroke:#102b83}</style>')
    expect(svg).toContain('fill="#cf3844"')
    expect(svg).toContain('style="stroke:#0a0a0a;opacity:0.2"')
    expect(svg).toContain('<svg fill="none">')
  })

  it('keeps gradient references and the alpha of translucent colours', () => {
    const svg = treatSvgColours(
      '<svg><path fill="url(#a)"/><stop stop-color="rgba(255, 255, 255, 0.5)"/></svg>',
      'test.svg'
    )

    expect(svg).toContain('fill="url(#a)"')
    expect(svg).toContain('stop-color="rgba(250, 250, 250, 0.5)"')
  })

  it('gives shapes and gradient stops without a colour the treated black', () => {
    const svg = treatSvgColours('<svg><stop offset="0"/></svg>', 'test.svg')

    expect(svg).toBe(
      '<svg fill="#0a0a0a"><stop offset="0" stop-color="#0a0a0a"/></svg>'
    )
  })

  it('stops on colours or features it cannot treat', () => {
    expect(() =>
      treatSvgColours('<svg><path fill="papayawhip"/></svg>', 'odd.svg')
    ).toThrow('odd.svg: unknown colour "papayawhip"')
    expect(() =>
      treatSvgColours('<svg><mask id="m"/></svg>', 'mask.svg')
    ).toThrow('mask.svg: <mask> is not handled')
  })
})
