import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCreateSlot } from '@/hooks/useCreateSlot'
import { useUpdateSlot } from '@/hooks/useUpdateSlot'
import { ApiError, errorMessage, isConflict } from '@/lib/api'
import {
  CUSTOM_DURATION,
  DURATION_PRESETS,
  DURATION_STEP_MIN,
  findOverlap,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  resolveDuration,
  START_TIMES,
} from '@/lib/slots'
import { slotSchema, type SlotFormInput, type SlotFormValues } from '@/lib/slotSchema'
import {
  addMinutesIso,
  dayKeyOf,
  formatDayShort,
  formatTime,
  formatTimeRange,
  keyToPickerDate,
  nowTimeInSkopje,
  pickerDateToKey,
  skopjeToUtcIso,
  todayKey,
} from '@/lib/time'
import type { Slot } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StartTimeSelect } from './StartTimeSelect'

interface SlotFormProps {
  /** Existing upcoming slots, for the instant overlap check. */
  slots: Slot[]
  /** An open slot to edit; without it the form adds a new slot. */
  slot?: Slot
  /** Called after an edit is saved. */
  onSaved?: () => void
}

function defaultValuesFor(slot: Slot | undefined): SlotFormInput {
  if (!slot) {
    return { topic: '', date: todayKey(), time: '', duration: '30', customDuration: '' }
  }
  const preset = DURATION_PRESETS.find((option) => Number(option) === slot.durationMin)
  return {
    topic: slot.topic,
    date: dayKeyOf(slot.startsAt),
    time: formatTime(slot.startsAt),
    duration: preset ?? CUSTOM_DURATION,
    customDuration: preset ? '' : String(slot.durationMin),
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined
}

export function SlotForm({ slots, slot, onSaved }: SlotFormProps) {
  const uid = useId()
  const createSlot = useCreateSlot()
  const updateSlot = useUpdateSlot(slot?.id ?? '')
  const save = slot ? updateSlot : createSlot
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [initialValues] = useState(() => defaultValuesFor(slot))
  // Slots created through the API may start off the 15-minute grid.
  const startTimes =
    initialValues.time && !START_TIMES.includes(initialValues.time)
      ? [...START_TIMES, initialValues.time].sort()
      : START_TIMES
  const form = useForm<SlotFormInput, unknown, SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: initialValues,
    // Errors appear once a field is left, then update live while it's fixed.
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setFocus,
    clearErrors,
    formState: { errors },
  } = form
  const [date, time, duration, customDuration] = useWatch({
    control,
    name: ['date', 'time', 'duration', 'customDuration'],
  })
  const durationMin = resolveDuration(duration, customDuration)

  const today = todayKey()
  const nowTime = nowTimeInSkopje()
  const startsAt = date && time ? skopjeToUtcIso(date, time) : null
  const endsAt = startsAt && durationMin ? addMinutesIso(startsAt, durationMin) : null
  // The slot being edited may keep (or overlap) its own current time.
  const otherSlots = slot ? slots.filter((other) => other.id !== slot.id) : slots
  const overlap = startsAt && endsAt ? findOverlap(otherSlots, startsAt, endsAt) : undefined
  // A time 409 (e.g. a Google Calendar clash) belongs to the start time, and only
  // while the rejected time is still the one picked. "Already booked" is not about
  // the time, so it stays a form-level error.
  const code = errorCode(save.error)
  const timeConflictError = isConflict(save.error) && code !== 'SLOT_BOOKED'
  const rejected = save.variables
  const timeConflict =
    timeConflictError && rejected?.startsAt === startsAt && rejected.durationMin === durationMin
      ? errorMessage(save.error)
      : undefined
  const timeError = errors.time?.message ?? timeConflict

  function chooseDuration(value: string) {
    // Ignore deselecting: a duration is always required.
    if (!value) return
    if (value === CUSTOM_DURATION) {
      // Start from the preset that was picked, so the preview stays valid.
      if (!getValues('customDuration') && duration !== CUSTOM_DURATION) {
        setValue('customDuration', duration)
      }
      // The field only mounts after this render.
      requestAnimationFrame(() => setFocus('customDuration', { shouldSelect: true }))
    } else {
      clearErrors('customDuration')
    }
    setValue('duration', value as SlotFormInput['duration'])
  }

  function submit(values: SlotFormValues) {
    const minutes = resolveDuration(values.duration, values.customDuration)
    if (overlap || minutes === null) return
    save.mutate(
      {
        topic: values.topic,
        startsAt: skopjeToUtcIso(values.date, values.time),
        durationMin: minutes,
      },
      {
        onSuccess: () => {
          if (slot) {
            toast.success('Slot updated')
            onSaved?.()
            return
          }
          toast.success('Slot published')
          // Keep date and duration so several slots can be added in a row.
          reset({ ...values, topic: '', time: '' })
        },
        onError: (error) => {
          if (isConflict(error) && errorCode(error) !== 'SLOT_BOOKED') setFocus('time')
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${uid}-topic`}>Topic</Label>
        <Input
          id={`${uid}-topic`}
          placeholder="e.g. Code review"
          aria-invalid={!!errors.topic}
          aria-describedby={errors.topic ? `${uid}-topic-error` : undefined}
          {...register('topic')}
        />
        <FieldError id={`${uid}-topic-error`} message={errors.topic?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <div className="space-y-2">
          <Label htmlFor={`${uid}-date`}>Date</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    ref={field.ref}
                    id={`${uid}-date`}
                    variant="outline"
                    className={cn(
                      'w-full justify-start font-normal',
                      !field.value && 'text-muted-foreground',
                    )}
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? `${uid}-date-error` : undefined}
                    onBlur={field.onBlur}
                  >
                    <CalendarIcon aria-hidden />
                    {field.value ? formatDayShort(field.value) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? keyToPickerDate(field.value) : undefined}
                    defaultMonth={field.value ? keyToPickerDate(field.value) : undefined}
                    disabled={{ before: keyToPickerDate(today) }}
                    weekStartsOn={1}
                    onSelect={(picked) => {
                      if (!picked) return
                      field.onChange(pickerDateToKey(picked))
                      setDatePickerOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          <FieldError id={`${uid}-date-error`} message={errors.date?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-time`}>Start time</Label>
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <StartTimeSelect
                ref={field.ref}
                id={`${uid}-time`}
                value={field.value}
                options={startTimes}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isDisabled={(option) => date === today && option <= nowTime}
                invalid={!!timeError}
                describedBy={timeError ? `${uid}-time-error` : undefined}
              />
            )}
          />
          <FieldError id={`${uid}-time-error`} message={timeError} />
        </div>
      </div>

      <div className="space-y-2">
        <Label id={`${uid}-duration-label`}>Duration (minutes)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby={`${uid}-duration-label`}
            value={duration}
            onValueChange={chooseDuration}
            className="flex-1"
          >
            {[...DURATION_PRESETS, CUSTOM_DURATION].map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className="flex-1 tabular-nums data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                {option === CUSTOM_DURATION ? 'Custom' : option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {duration === CUSTOM_DURATION && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_DURATION_MIN}
                max={MAX_DURATION_MIN}
                step={DURATION_STEP_MIN}
                aria-label="Custom duration in minutes"
                aria-invalid={!!errors.customDuration}
                aria-describedby={errors.customDuration ? `${uid}-duration-error` : undefined}
                className="w-24 tabular-nums"
                {...register('customDuration')}
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          )}
        </div>
        <FieldError id={`${uid}-duration-error`} message={errors.customDuration?.message} />
      </div>

      <div aria-live="polite" className="min-h-6 space-y-1 text-sm">
        {startsAt && endsAt ? (
          <p className="font-medium tabular-nums">
            {formatDayShort(date)}, {formatTimeRange({ startsAt, endsAt })}
          </p>
        ) : (
          <p className="text-muted-foreground">Pick a date, start time and duration.</p>
        )}
        {overlap && (
          <p className="text-destructive-text">
            This overlaps {formatTimeRange(overlap)}. Pick another time.
          </p>
        )}
      </div>

      {save.error && !timeConflictError && (
        <p role="alert" className="text-sm whitespace-pre-line text-destructive-text">
          {errorMessage(save.error)}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={save.isPending || !!overlap}
        aria-busy={save.isPending}
      >
        {save.isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
        {slot ? 'Save changes' : 'Publish slot'}
      </Button>
    </form>
  )
}
