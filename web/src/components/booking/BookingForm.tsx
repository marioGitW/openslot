import { Loader2 } from 'lucide-react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  NOTE_MAX,
  type BookingFormInput,
  type BookingFormValues,
} from '@/lib/bookingSchema'
import { cn } from '@/lib/utils'

interface BookingFormProps {
  form: UseFormReturn<BookingFormInput, unknown, BookingFormValues>
  submitLabel: string
  submitting: boolean
  submitError: string | null
  onSubmit: (values: BookingFormValues) => void
  /** Pin the submit button to the bottom of a scrolling container (drawer). */
  stickyFooter?: boolean
  className?: string
}

export function BookingForm({
  form,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
  stickyFooter = false,
  className,
}: BookingFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form
  const note = useWatch({ control, name: 'note' }) ?? ''

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className={cn('flex min-h-0 flex-col', className)}
    >
      <div className={cn('space-y-4', stickyFooter && 'flex-1 overflow-y-auto px-4 pb-4')}>
        <div className="space-y-2">
          <Label htmlFor="booking-name">Name</Label>
          <Input
            id="booking-name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'booking-name-error' : undefined}
            {...register('name')}
          />
          <FieldError id="booking-name-error" message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-email">Email</Label>
          <Input
            id="booking-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'booking-email-error' : undefined}
            {...register('email')}
          />
          <FieldError id="booking-email-error" message={errors.email?.message} />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="booking-note">What do you want to cover?</Label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <Textarea
            id="booking-note"
            rows={4}
            className="min-h-24"
            aria-invalid={!!errors.note}
            aria-describedby={
              errors.note ? 'booking-note-error booking-note-count' : 'booking-note-count'
            }
            {...register('note')}
          />
          <div className="flex justify-between gap-2 text-xs">
            <span id="booking-note-error" className="text-sm text-destructive-text">
              {errors.note?.message}
            </span>
            <span
              id="booking-note-count"
              className={cn(
                'tabular-nums',
                note.length > NOTE_MAX ? 'text-destructive-text' : 'text-muted-foreground',
              )}
            >
              {note.length}/{NOTE_MAX}
            </span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'space-y-3',
          stickyFooter ? 'sticky bottom-0 border-t bg-popover p-4' : 'pt-6',
        )}
      >
        {submitError && (
          <p role="alert" className="text-sm whitespace-pre-line text-destructive-text">
            {submitError}
          </p>
        )}
        <Button
          type="submit"
          className="w-full tabular-nums"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
