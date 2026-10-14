import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import type { BookingFormInput, BookingFormValues } from '@/lib/bookingSchema'
import { dayKeyOf, formatDayLong, formatTimeRange } from '@/lib/time'
import type { Booking, Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BookingConfirmation } from './BookingConfirmation'
import { BookingForm } from './BookingForm'

export type PanelLayout = 'card' | 'sheet' | 'drawer'

export interface BookingPanelContentProps {
  layout: PanelLayout
  slot: Slot | null
  confirmed: Booking | null
  conflict: boolean
  form: UseFormReturn<BookingFormInput, unknown, BookingFormValues>
  submitting: boolean
  submitError: string | null
  onSubmit: (values: BookingFormValues) => void
  onBookAnother: () => void
  onPickAnother: () => void
}

export function BookingPanelContent({
  layout,
  slot,
  confirmed,
  conflict,
  form,
  submitting,
  submitError,
  onSubmit,
  onBookAnother,
  onPickAnother,
}: BookingPanelContentProps) {
  const inset = layout === 'card' ? '' : 'px-4'
  const scrolls = layout !== 'card'

  if (confirmed) {
    return (
      <div className={cn(inset, scrolls && 'overflow-y-auto pb-6')}>
        <BookingConfirmation booking={confirmed} onBookAnother={onBookAnother} />
      </div>
    )
  }

  if (!slot) {
    return (
      <div className={cn('space-y-1', inset)}>
        <h2 className="text-lg font-semibold tracking-tight">Choose a time</h2>
        <p className="text-sm text-muted-foreground">
          Pick an open time to enter your details.
        </p>
      </div>
    )
  }

  const range = formatTimeRange(slot)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn('space-y-1 pb-5', inset)}>
        <p className="text-2xl font-semibold tabular-nums">{range}</p>
        <p className="text-sm text-muted-foreground">
          {formatDayLong(dayKeyOf(slot.startsAt))} · {slot.durationMin} min
        </p>
        <p>{slot.topic}</p>
      </div>

      {conflict ? (
        <div className={cn('space-y-4 pb-6', inset)}>
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium"
          >
            Someone just booked this time. Pick another slot.
          </p>
          {layout !== 'card' && (
            <Button className="w-full" onClick={onPickAnother}>
              Pick another time
            </Button>
          )}
        </div>
      ) : (
        <BookingForm
          form={form}
          submitLabel={`Book ${range}`}
          submitting={submitting}
          submitError={submitError}
          onSubmit={onSubmit}
          stickyFooter={scrolls}
          className={scrolls ? 'flex-1' : undefined}
        />
      )}
    </div>
  )
}
