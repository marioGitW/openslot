import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { AddSlotForm } from '@/components/host/AddSlotForm'
import { HostFilterBar } from '@/components/host/HostFilterBar'
import { HostSlotList } from '@/components/host/HostSlotList'
import { HostSlotListSkeleton } from '@/components/host/HostSlotListSkeleton'
import { HostSummary } from '@/components/host/HostSummary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useHostFilters } from '@/hooks/useHostFilters'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { useSlots } from '@/hooks/useSlots'
import { filterSlots } from '@/lib/slots'

export function HostPage() {
  const isLg = useMediaQuery(MEDIA.lg)
  const isMd = useMediaQuery(MEDIA.md)
  const slotsQuery = useSlots('all')
  const [formOpen, setFormOpen] = useState(false)
  const { filter, setRange, setStatus, clear } = useHostFilters()
  const slots = slotsQuery.data ?? []
  const visibleSlots = filterSlots(slots, filter)
  // The overlap check needs every slot, not just the filtered ones.
  const form = <AddSlotForm slots={slots} />

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
    list = <HostSlotList slots={visibleSlots} />
  }

  return (
    <div className="space-y-8">
      <HostSummary slots={slotsQuery.data} filter={filter} />

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
              onRangeChange={setRange}
              onStatusChange={setStatus}
            />
          )}
          {list}
        </section>
      </div>

      {!isLg && isMd && (
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetContent
            side="right"
            aria-describedby={undefined}
            className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-[420px]"
          >
            <SheetHeader className="px-4 pt-5 pr-14 pb-4">
              <SheetTitle className="text-base">Add a slot</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{form}</div>
          </SheetContent>
        </Sheet>
      )}

      {!isMd && (
        <Drawer open={formOpen} onOpenChange={setFormOpen}>
          <DrawerContent
            aria-describedby={undefined}
            className="data-[vaul-drawer-direction=bottom]:max-h-[90vh]"
          >
            <DrawerHeader className="px-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle className="text-base">Add a slot</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">{form}</div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
