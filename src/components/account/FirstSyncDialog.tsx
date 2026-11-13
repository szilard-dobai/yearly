'use client'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { FirstSyncRequest } from '@/lib/calendar-sync/sync'

function days(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

export default function FirstSyncDialog({
  request,
}: {
  request: FirstSyncRequest | null
}) {
  return (
    <AlertDialog open={request !== null}>
      <AlertDialogContent>
        {request && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                This device has trips that aren&apos;t in your account
              </AlertDialogTitle>
              <AlertDialogDescription>
                {days(request.summary.newDays)} here{' '}
                {request.summary.newDays === 1 ? "isn't" : "aren't"} in your
                account yet. Your account has{' '}
                {days(request.summary.accountDays)} of trips.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {request.summary.crowdedDays > 0 && (
              <p className="text-sm text-muted-foreground">
                On {days(request.summary.crowdedDays)}, the two calendars have
                more than two countries between them. If you add them, those
                days keep this device&apos;s countries.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Using your account only replaces the trips on this device with
              your account&apos;s.
            </p>
            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => request.resolve('account')}
              >
                Use my account only
              </Button>
              <Button onClick={() => request.resolve('merge')}>
                Add them to my account
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
