import { Skeleton } from '@/components/ui/skeleton'
import { host } from '@/config/host'
import { useAiMessage } from '@/hooks/useAiMessage'
import type { Booking } from '@/lib/types'

/** The note under a confirmed booking. Loads after the booking and never blocks it. */
export function AiMessage({ booking }: { booking: Booking }) {
  const { data, isPending, isError } = useAiMessage(booking.id)

  let content
  if (isPending) {
    content = (
      <div className="space-y-2">
        <Skeleton aria-hidden className="h-4 w-full" />
        <p className="text-muted-foreground">Writing a note for you…</p>
      </div>
    )
  } else if (isError) {
    // The API already falls back to a template; this only covers a network error.
    content = booking.note && (
      <p className="text-muted-foreground">
        {host.firstName} will see your note before the call.
      </p>
    )
  } else {
    content = (
      <>
        <p className="text-pretty">{data.message}</p>
        {data.source === 'ai' && (
          <p className="text-xs text-muted-foreground">Written with AI</p>
        )}
      </>
    )
  }

  return (
    <div aria-live="polite" className="space-y-1 text-sm">
      {content}
    </div>
  )
}
