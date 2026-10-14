import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
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
import { errorMessage, isConflict } from '@/lib/api'
import {
  CUSTOM_DURATION,
  DURATION_PRESETS,
  DURATION_STEP_MIN,
  findOverlap,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  resolveDuration,
} from '@/lib/slots'
import { slotSchema, type SlotFormInput, type SlotFormValues } from '@/lib/slotSchema'
import {
  addMinutesIso,
  formatDayShort,
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

interface AddSlotFormProps {
  /** Existing upcoming slots, for the instant overlap check. */
  slots: Slot[]
}

export function AddSlotForm({ slots }: AddSlotFormProps) {
  const createSlot = useCreateSlot()
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const form = useForm<SlotFormInput, unknown, SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      topic: '',
      date: todayKey(),
      time: '',
      duration: '30',
      customDuration: '',
    },
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
  const overlap = startsAt && endsAt ? findOverlap(slots, startsAt, endsAt) : undefined
  // A 409 (e.g. a Google Calendar clash) belongs to the start time, and only while
  // the rejected time is still the one picked.
  const rejected = createSlot.variables
  const timeConflict =
    isConflict(createSlot.error) &&
    rejected?.startsAt === startsAt &&
    rejected.durationMin === durationMin
      ? errorMessage(createSlot.error)
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
    createSlot.mutate(
      {
        topic: values.topic,
        startsAt: skopjeToUtcIso(values.date, values.time),
        durationMin: minutes,
      },
      {
        onSuccess: () => {
          toast.success('Slot published')
          // Keep date and duration so several slots can be added in a row.
          reset({ ...values, topic: '', time: '' })
        },
        onError: (error) => {
          if (isConflict(error)) setFocus('time')
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="slot-topic">Topic</Label>
        <Input
          id="slot-topic"
          placeholder="e.g. Code review"
          aria-invalid={!!errors.topic}
          aria-describedby={errors.topic ? 'slot-topic-error' : undefined}
          {...register('topic')}
        />
        <FieldError id="slot-topic-error" message={errors.topic?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <div className="space-y-2">
          <Label htmlFor="slot-date">Date</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    ref={field.ref}
                    id="slot-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start font-normal',
                      !field.value && 'text-muted-foreground',
                    )}
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? 'slot-date-error' : undefined}
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
          <FieldError id="slot-date-error" message={errors.date?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slot-time">Start time</Label>
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <StartTimeSelect
                ref={field.ref}
                id="slot-time"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isDisabled={(option) => date === today && option <= nowTime}
                invalid={!!timeError}
                describedBy={timeError ? 'slot-time-error' : undefined}
              />
            )}
          />
          <FieldError id="slot-time-error" message={timeError} />
        </div>
      </div>

      <div className="space-y-2">
        <Label id="slot-duration-label">Duration (minutes)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="slot-duration-label"
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
                aria-describedby={errors.customDuration ? 'slot-duration-error' : undefined}
                className="w-24 tabular-nums"
                {...register('customDuration')}
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          )}
        </div>
        <FieldError id="slot-duration-error" message={errors.customDuration?.message} />
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

      {createSlot.error && !isConflict(createSlot.error) && (
        <p role="alert" className="text-sm whitespace-pre-line text-destructive-text">
          {errorMessage(createSlot.error)}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={createSlot.isPending || !!overlap}
        aria-busy={createSlot.isPending}
      >
        {createSlot.isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden />}
        Publish slot
      </Button>
    </form>
  )
}
