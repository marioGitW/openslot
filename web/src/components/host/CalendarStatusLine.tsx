import { CalendarCheck, TriangleAlert } from 'lucide-react'
import type { CalendarStatus } from '@/lib/types'

/** Under the host header; nothing while loading, on error or when the calendar is off. */
export function CalendarStatusLine({ status }: { status: CalendarStatus | undefined }) {
  if (!status?.enabled) return null

  if (status.ok) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarCheck className="size-4 shrink-0" aria-hidden />
        Checking availability against Google Calendar
      </p>
    )
  }

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive-text" aria-hidden />
      Couldn't check Google Calendar. Conflicts may be missing.
    </p>
  )
}
