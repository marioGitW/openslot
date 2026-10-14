import { CalendarPlus, CircleCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { host } from '@/config/host'
import { downloadIcs } from '@/lib/ics'
import { dayKeyOf, formatDayLong, formatTimeRange } from '@/lib/time'
import type { Booking } from '@/lib/types'

interface BookingConfirmationProps {
  booking: Booking
  onBookAnother: () => void
}

export function BookingConfirmation({ booking, onBookAnother }: BookingConfirmationProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const { slot } = booking

  // Move focus to the result so screen reader and keyboard users land on it.
  useEffect(() => {
    heading.current?.focus()
  }, [booking.id])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CircleCheck className="size-6 text-primary" aria-hidden />
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight outline-none"
          >
            You're booked
          </h2>
        </div>
        <dl className="space-y-1">
          <div>
            <dt className="sr-only">Day</dt>
            <dd className="text-muted-foreground">{formatDayLong(dayKeyOf(slot.startsAt))}</dd>
          </div>
          <div>
            <dt className="sr-only">Time</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatTimeRange(slot)}</dd>
          </div>
          <div>
            <dt className="sr-only">Topic</dt>
            <dd>{slot.topic}</dd>
          </div>
        </dl>
        {booking.note && (
          <p className="text-sm text-muted-foreground">
            {host.firstName} will see your note before the call.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => downloadIcs(booking)}>
          <CalendarPlus aria-hidden />
          Add to calendar
        </Button>
        <Button variant="ghost" onClick={onBookAnother}>
          Book another time
        </Button>
      </div>
    </div>
  )
}
