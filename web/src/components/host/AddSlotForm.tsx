import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCreateSlot } from '@/hooks/useCreateSlot'
import { errorMessage } from '@/lib/api'
import { findOverlap, START_TIMES } from '@/lib/slots'
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
import { SLOT_DURATIONS, type Slot, type SlotDuration } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddSlotFormProps {
  /** Existing upcoming slots, for the instant overlap check. */
  slots: Slot[]
}

export function AddSlotForm({ slots }: AddSlotFormProps) {
  const createSlot = useCreateSlot()
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const form = useForm<SlotFormInput, unknown, SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: { topic: '', date: todayKey(), time: '', duration: '30' },
    mode: 'onTouched',
  })
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form
  const [date, time, duration] = useWatch({ control, name: ['date', 'time', 'duration'] })

  const today = todayKey()
  const nowTime = nowTimeInSkopje()
  const startsAt = date && time ? skopjeToUtcIso(date, time) : null
  const endsAt = startsAt ? addMinutesIso(startsAt, Number(duration)) : null
  const overlap = startsAt && endsAt ? findOverlap(slots, startsAt, endsAt) : undefined

  function submit(values: SlotFormValues) {
    if (overlap) return
    createSlot.mutate(
      {
        topic: values.topic,
        startsAt: skopjeToUtcIso(values.date, values.time),
        durationMin: Number(values.duration) as SlotDuration,
      },
      {
        onSuccess: () => {
          toast.success('Slot published')
          // Keep date and duration so several slots can be added in a row.
          reset({ topic: '', date: values.date, time: '', duration: values.duration })
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
        {errors.topic && (
          <p id="slot-topic-error" className="text-sm text-destructive-text">
            {errors.topic.message}
          </p>
        )}
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
                    id="slot-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start font-normal',
                      !field.value && 'text-muted-foreground',
                    )}
                    aria-invalid={!!errors.date}
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
          {errors.date && <p className="text-sm text-destructive-text">{errors.date.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slot-time">Start time</Label>
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="slot-time"
                  className="w-full tabular-nums"
                  aria-invalid={!!errors.time}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder="Pick a time" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {START_TIMES.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className="tabular-nums"
                      disabled={date === today && option <= nowTime}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.time && <p className="text-sm text-destructive-text">{errors.time.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label id="slot-duration-label">Duration</Label>
        <Controller
          control={control}
          name="duration"
          render={({ field }) => (
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="slot-duration-label"
              value={field.value}
              // Ignore deselecting: a duration is always required.
              onValueChange={(value) => value && field.onChange(value)}
              className="w-full"
            >
              {SLOT_DURATIONS.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={String(option)}
                  className="flex-1 tabular-nums data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  {option} min
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </div>

      <div aria-live="polite" className="min-h-6 space-y-1 text-sm">
        {startsAt && endsAt ? (
          <p className="font-medium tabular-nums">
            {formatDayShort(date)}, {formatTimeRange({ startsAt, endsAt })}
          </p>
        ) : (
          <p className="text-muted-foreground">Pick a date and start time.</p>
        )}
        {overlap && (
          <p className="text-destructive-text">
            This overlaps {formatTimeRange(overlap)}. Pick another time.
          </p>
        )}
      </div>

      {createSlot.error && (
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
