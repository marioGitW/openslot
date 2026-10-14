import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  addDaysToKey,
  endOfWeekKey,
  formatDayMonthShort,
  formatRangeShort,
  keyToPickerDate,
  pickerDateToKey,
  todayKey,
} from '@/lib/time'

interface DateRangeFilterProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
}

interface Preset {
  label: string
  from: string | null
  to: string | null
}

// Past days are never listed, so "This week" runs from today to Sunday.
function presetsFor(today: string): Preset[] {
  return [
    { label: 'Next 7 days', from: today, to: addDaysToKey(today, 6) },
    { label: 'Next 30 days', from: today, to: addDaysToKey(today, 29) },
    { label: 'This week', from: today, to: endOfWeekKey(today) },
    { label: 'All upcoming', from: null, to: null },
  ]
}

function toPickerRange(from: string | null, to: string | null): DateRange | undefined {
  return from && to ? { from: keyToPickerDate(from), to: keyToPickerDate(to) } : undefined
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  // The range being picked while the popover is open; applied once both ends are set.
  const [draft, setDraft] = useState<DateRange | undefined>()
  // Day under the pointer, to preview the range before the second click.
  const [hovered, setHovered] = useState<Date | null>(null)
  const today = todayKey()
  const label = from && to ? formatRangeShort(from, to) : 'All upcoming'

  function apply(nextFrom: string | null, nextTo: string | null) {
    onChange(nextFrom, nextTo)
    setOpen(false)
  }

  function changeOpen(next: boolean) {
    if (next) {
      setDraft(toPickerRange(from, to))
    } else if (draft?.from && !draft.to) {
      // Closed after picking only a start: filter on that single day.
      const day = pickerDateToKey(draft.from)
      onChange(day, day)
    }
    setOpen(next)
  }

  // After the first click, shade every day from the start to the hovered day.
  const picking = draft?.from && !draft.to ? draft.from : null
  const preview: DateRange | undefined =
    picking && hovered
      ? hovered < picking
        ? { from: hovered, to: picking }
        : { from: picking, to: hovered }
      : undefined

  function pick(range: DateRange | undefined) {
    setDraft(range)
    setHovered(null)
    if (range?.from && range.to) apply(pickerDateToKey(range.from), pickerDateToKey(range.to))
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-w-0 flex-1 justify-start font-normal sm:flex-none"
        >
          <CalendarIcon aria-hidden />
          <span className="sr-only">Date range: </span>
          <span className="truncate tabular-nums">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-auto gap-0 p-0">
        <div className="flex flex-col md:flex-row">
          <div
            role="group"
            aria-label="Quick ranges"
            className="flex flex-wrap gap-1 border-b p-2 md:w-40 md:flex-col md:flex-nowrap md:border-r md:border-b-0"
          >
            {presetsFor(today).map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                aria-pressed={preset.from === from && preset.to === to}
                className="justify-start aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                onClick={() => apply(preset.from, preset.to)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div>
            <Calendar
              mode="range"
              // A click on a complete range starts a new one instead of extending it.
              resetOnSelect
              selected={draft}
              onSelect={pick}
              onDayMouseEnter={(day) => setHovered(day)}
              onDayMouseLeave={() => setHovered(null)}
              modifiers={{ preview }}
              modifiersClassNames={{ preview: 'rounded-none bg-accent text-accent-foreground' }}
              defaultMonth={draft?.from ?? keyToPickerDate(today)}
              disabled={{ before: keyToPickerDate(today) }}
              weekStartsOn={1}
              className="p-2 md:p-3"
            />
            <div className="flex items-center justify-between gap-3 border-t p-2 md:px-3">
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {picking
                  ? `${formatDayMonthShort(pickerDateToKey(picking))} – pick an end date`
                  : 'Pick a start date.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => apply(null, null)}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
