import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { CalendarStatusLine } from '@/components/host/CalendarStatusLine'
import { HostFilterBar } from '@/components/host/HostFilterBar'
import { HostSlotList } from '@/components/host/HostSlotList'
import { HostSlotListSkeleton } from '@/components/host/HostSlotListSkeleton'
import { HostSummary } from '@/components/host/HostSummary'
import { SlotForm } from '@/components/host/SlotForm'
import { SlotFormPanel } from '@/components/host/SlotFormPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendarStatus } from '@/hooks/useCalendarStatus'
import { useHostFilters } from '@/hooks/useHostFilters'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { useSlots } from '@/hooks/useSlots'
import { filterSlots } from '@/lib/slots'
import type { Slot } from '@/lib/types'

export function HostPage() {
  const isLg = useMediaQuery(MEDIA.lg)
  const slotsQuery = useSlots('all')
  const calendarStatus = useCalendarStatus().data
  const [formOpen, setFormOpen] = useState(false)
  // The id stays set while the panel closes, so its content doesn't vanish mid-animation.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const { filter, setRange, setStatus, clear } = useHostFilters()
  const slots = slotsQuery.data ?? []
  const visibleSlots = filterSlots(slots, filter)
  // The overlap check needs every slot, not just the filtered ones.
  const form = <SlotForm slots={slots} />
  // Read from the live list, so a booking or delete elsewhere shows up here.
  const editingSlot = editingId ? slots.find((slot) => slot.id === editingId) : undefined

  function startEditing(slot: Slot) {
    setEditingId(slot.id)
    setEditOpen(true)
  }

  let list
  if (slotsQuery.isPending) {
    list = <HostSlotListSkeleton />
  } else if (slotsQuery.isError) {
    list = (
      <ErrorState
        message="Couldn't load slots."
        onRetry={() => void slotsQuery.refetch()}
        retrying={slotsQuery.isFetching}
      />
    )
  } else if (slots.length === 0) {
    list = <EmptyState>No slots yet. Add your first one to start taking bookings.</EmptyState>
  } else if (visibleSlots.length === 0) {
    list = (
      <EmptyState
        action={
          <Button variant="outline" onClick={clear}>
            Clear filters
          </Button>
        }
      >
        No slots match this filter.
      </EmptyState>
    )
  } else {
    list = <HostSlotList slots={visibleSlots} onEdit={startEditing} />
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <HostSummary slots={slotsQuery.data} filter={filter} />
        <CalendarStatusLine status={calendarStatus} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        {isLg && (
          <aside aria-label="Add a slot" className="sticky top-24 self-start">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="text-lg font-semibold tracking-tight">Add a slot</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>{form}</CardContent>
            </Card>
          </aside>
        )}

        <section aria-label="Upcoming slots" className="min-w-0 space-y-4">
          {!isLg && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus aria-hidden />
              Add a slot
            </Button>
          )}
          {slots.length > 0 && (
            <HostFilterBar
              filter={filter}
              showConflicts={calendarStatus?.enabled === true}
              onRangeChange={setRange}
              onStatusChange={setStatus}
            />
          )}
          {list}
        </section>
      </div>

      {!isLg && (
        <SlotFormPanel open={formOpen} onOpenChange={setFormOpen} title="Add a slot">
          {form}
        </SlotFormPanel>
      )}

      <SlotFormPanel
        open={editOpen && !!editingSlot}
        onOpenChange={setEditOpen}
        title="Edit slot"
      >
        {editingSlot?.booking ? (
          <div className="space-y-4">
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium"
            >
              This slot was just booked, so it can't be edited.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setEditOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          editingSlot && (
            <SlotForm
              key={editingSlot.id}
              slots={slots}
              slot={editingSlot}
              onSaved={() => setEditOpen(false)}
            />
          )
        )}
      </SlotFormPanel>
    </div>
  )
}
