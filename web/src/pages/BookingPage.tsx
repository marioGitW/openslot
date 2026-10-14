import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { BookingPanel } from '@/components/booking/BookingPanel'
import type { PanelLayout } from '@/components/booking/BookingPanelContent'
import { HostIntro } from '@/components/booking/HostIntro'
import { TimeRail } from '@/components/booking/TimeRail'
import { TimeRailSkeleton } from '@/components/booking/TimeRailSkeleton'
import { WeekStrip } from '@/components/booking/WeekStrip'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useBookSlot } from '@/hooks/useBookSlot'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { useSlots } from '@/hooks/useSlots'
import { errorMessage, isConflict } from '@/lib/api'
import {
  bookingSchema,
  emptyBookingForm,
  type BookingFormInput,
  type BookingFormValues,
} from '@/lib/bookingSchema'
import {
  addDaysToKey,
  dayKeyOf,
  daysBetweenKeys,
  groupSlotsByDay,
  todayKey,
  weekdayLong,
} from '@/lib/time'
import type { Booking, Slot } from '@/lib/types'

const REFETCH_INTERVAL_MS = 30_000
const COLLAPSE_MS = 350

/** Weeks start today; returns the first day of the week that contains `day`. */
function weekStartFor(today: string, day: string): string {
  const weeks = Math.max(0, Math.floor(daysBetweenKeys(today, day) / 7))
  return addDaysToKey(today, weeks * 7)
}

function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i))
}

export function BookingPage() {
  const isLg = useMediaQuery(MEDIA.lg)
  const isMd = useMediaQuery(MEDIA.md)
  const reducedMotion = useMediaQuery(MEDIA.reducedMotion)
  const layout: PanelLayout = isLg ? 'card' : isMd ? 'sheet' : 'drawer'

  const slotsQuery = useSlots('available', { refetchInterval: REFETCH_INTERVAL_MS })
  const bookSlot = useBookSlot()
  // Lives here (not inside the sheet/drawer) so typed values survive closing it
  // and switching days; it is cleared only after a successful booking.
  const form = useForm<BookingFormInput, unknown, BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: emptyBookingForm,
    // Errors appear once a field is left, then update live while it's fixed.
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })

  // null = not chosen by the user yet; the effective value is derived from data.
  const [weekStartChoice, setWeekStartChoice] = useState<string | null>(null)
  const [dayChoice, setDayChoice] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [confirmed, setConfirmed] = useState<Booking | null>(null)
  const [leavingSlot, setLeavingSlot] = useState<Slot | null>(null)
  // Slots we know are taken, hidden before the refetch confirms it.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set())

  const today = todayKey()
  const byDay = useMemo(
    () => groupSlotsByDay((slotsQuery.data ?? []).filter((s) => !hiddenIds.has(s.id))),
    [slotsQuery.data, hiddenIds],
  )
  const counts = useMemo(
    () => new Map([...byDay].map(([day, slots]) => [day, slots.length])),
    [byDay],
  )

  const firstOpenDay = byDay.keys().next().value ?? today
  const selectedDay = dayChoice ?? firstOpenDay
  const weekStart = weekStartChoice ?? weekStartFor(today, selectedDay)
  // Week navigation skips weeks without open times.
  const openWeeks = useMemo(
    () => [...new Set([...byDay.keys()].map((day) => weekStartFor(today, day)))],
    [byDay, today],
  )
  const prevOpenWeek = openWeeks.findLast((start) => start < weekStart)
  const nextOpenWeek = openWeeks.find((start) => start > weekStart)

  const daySlots = useMemo(() => {
    const slots = byDay.get(selectedDay) ?? []
    if (!leavingSlot || dayKeyOf(leavingSlot.startsAt) !== selectedDay) return slots
    return [...slots, leavingSlot].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, [byDay, selectedDay, leavingSlot])

  const conflict = isConflict(bookSlot.error)
  const submitError = bookSlot.error && !conflict ? errorMessage(bookSlot.error) : null

  function hideSlot(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id))
  }

  /** Back to "Choose a time": the panel follows the day, typed details stay in the form. */
  function clearSelection() {
    bookSlot.reset()
    setConfirmed(null)
    setSelectedSlot(null)
    setPanelOpen(false)
  }

  function selectDay(day: string) {
    if (day === selectedDay) return
    setDayChoice(day)
    clearSelection()
  }

  function goToWeek(start: string) {
    clearSelection()
    setWeekStartChoice(start)
    setDayChoice(weekDays(start).find((day) => counts.has(day)) ?? start)
  }

  function selectSlot(slot: Slot) {
    // Pin the current view so it doesn't jump when this day runs out of slots.
    setDayChoice(selectedDay)
    setWeekStartChoice(weekStart)
    bookSlot.reset()
    setConfirmed(null)
    setSelectedSlot(slot)
    setPanelOpen(true)
  }

  function submit(values: BookingFormValues) {
    if (!selectedSlot) return
    const slot = selectedSlot
    bookSlot.mutate(
      {
        slotId: slot.id,
        input: {
          name: values.name,
          email: values.email,
          note: values.note || undefined,
          startsAt: slot.startsAt,
          durationMin: slot.durationMin,
        },
      },
      {
        onSuccess: (booking) => {
          hideSlot(slot.id)
          setConfirmed(booking)
          setSelectedSlot(null)
          form.reset(emptyBookingForm)
          if (!reducedMotion) {
            setLeavingSlot(slot)
            window.setTimeout(
              () => setLeavingSlot((current) => (current?.id === slot.id ? null : current)),
              COLLAPSE_MS,
            )
          }
        },
        onError: (error) => {
          if (isConflict(error)) hideSlot(slot.id)
        },
      },
    )
  }

  let rail: ReactNode
  if (slotsQuery.isPending) {
    rail = <TimeRailSkeleton />
  } else if (slotsQuery.isError) {
    rail = (
      <ErrorState
        message="Couldn't load times."
        detail={errorMessage(slotsQuery.error)}
        onRetry={() => void slotsQuery.refetch()}
        retrying={slotsQuery.isFetching}
      />
    )
  } else if (daySlots.length > 0) {
    rail = (
      <TimeRail
        slots={daySlots}
        label={`Open times on ${weekdayLong(selectedDay)}`}
        selectedSlotId={selectedSlot?.id ?? null}
        leavingSlotId={leavingSlot?.id ?? null}
        onSelect={selectSlot}
      />
    )
  } else if (openWeeks.length === 0) {
    rail = <EmptyState>No open times right now. Check back soon.</EmptyState>
  } else {
    rail = (
      <EmptyState>
        No open times on {weekdayLong(selectedDay)}. Try another day.
      </EmptyState>
    )
  }

  const panel = (
    <BookingPanel
      layout={layout}
      open={panelOpen}
      onOpenChange={setPanelOpen}
      slot={selectedSlot}
      confirmed={confirmed}
      conflict={conflict}
      form={form}
      submitting={bookSlot.isPending}
      submitError={submitError}
      onSubmit={submit}
      onBookAnother={clearSelection}
      onPickAnother={clearSelection}
    />
  )

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,680px)_380px] lg:justify-between">
        <div className="min-w-0 space-y-10">
          <HostIntro />

          <section aria-labelledby="pick-a-time" className="space-y-5">
            <h2 id="pick-a-time" className="text-lg font-semibold tracking-tight">
              Pick a time
            </h2>
            {slotsQuery.isPending ? (
              <Skeleton className="h-20 w-full rounded-md" />
            ) : (
              <WeekStrip
                weekStart={weekStart}
                selectedDay={selectedDay}
                counts={counts}
                canGoPrev={prevOpenWeek !== undefined}
                canGoNext={nextOpenWeek !== undefined}
                onSelectDay={selectDay}
                onPrevWeek={() => prevOpenWeek && goToWeek(prevOpenWeek)}
                onNextWeek={() => nextOpenWeek && goToWeek(nextOpenWeek)}
              />
            )}
            <div className="space-y-4">
              {rail}
              {!slotsQuery.isPending && !slotsQuery.isError && (
                <p className="text-sm text-muted-foreground">Times shown in Skopje time.</p>
              )}
            </div>
          </section>
        </div>

        {layout === 'card' && (
          <aside aria-label="Booking" className="sticky top-24 self-start">
            {panel}
          </aside>
        )}
      </div>

      {layout !== 'card' && panel}
    </>
  )
}
