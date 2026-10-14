import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { focusRing } from '@/lib/styles'
import {
  addDaysToKey,
  dayOfMonth,
  formatDayLong,
  weekdayShort,
} from '@/lib/time'
import { cn } from '@/lib/utils'

interface WeekStripProps {
  weekStart: string
  selectedDay: string
  /** Open slot count per day key */
  counts: Map<string, number>
  /** False when no earlier / later week has open times; the arrow is then hidden. */
  canGoPrev: boolean
  canGoNext: boolean
  onSelectDay: (dayKey: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
}

export function WeekStrip({
  weekStart,
  selectedDay,
  counts,
  canGoPrev,
  canGoNext,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
}: WeekStripProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i))
  const buttons = useRef(new Map<string, HTMLButtonElement>())

  // Keep the selected day visible in the horizontally scrolling strip on mobile.
  useEffect(() => {
    buttons.current
      .get(selectedDay)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selectedDay])

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Hidden arrows keep their space so the days don't shift. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevWeek}
        disabled={!canGoPrev}
        aria-label="Previous week with open times"
        className={cn(!canGoPrev && 'invisible')}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Button>

      <div
        role="group"
        aria-label="Days"
        className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto p-1"
      >
        {days.map((day) => {
          const count = counts.get(day) ?? 0
          const selected = day === selectedDay
          return (
            <button
              key={day}
              ref={(el) => {
                if (el) buttons.current.set(day, el)
                else buttons.current.delete(day)
              }}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={selected}
              aria-label={`${formatDayLong(day)}, ${
                count === 0 ? 'no open times' : `${count} open ${count === 1 ? 'time' : 'times'}`
              }`}
              className={cn(
                'flex min-h-18 min-w-14 flex-1 snap-start flex-col items-center justify-center gap-0.5 rounded-md border py-2 transition-colors',
                focusRing,
                selected
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-transparent hover:bg-muted',
                !selected && count === 0 && 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'text-xs',
                  selected ? 'text-accent-foreground' : 'text-muted-foreground',
                )}
              >
                {weekdayShort(day)}
              </span>
              <span className="text-lg leading-none font-semibold tabular-nums">
                {dayOfMonth(day)}
              </span>
              <span className="flex h-4 items-center gap-1 text-xs tabular-nums">
                {count > 0 && (
                  <>
                    <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                    {count}
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNextWeek}
        disabled={!canGoNext}
        aria-label="Next week with open times"
        className={cn(!canGoNext && 'invisible')}
      >
        <ChevronRight className="size-5" aria-hidden />
      </Button>
    </div>
  )
}
