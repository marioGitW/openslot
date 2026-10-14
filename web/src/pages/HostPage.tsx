import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { AddSlotForm } from '@/components/host/AddSlotForm'
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
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { useSlots } from '@/hooks/useSlots'

export function HostPage() {
  const isLg = useMediaQuery(MEDIA.lg)
  const isMd = useMediaQuery(MEDIA.md)
  const slotsQuery = useSlots('all')
  const [formOpen, setFormOpen] = useState(false)
  const slots = slotsQuery.data ?? []
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
  } else {
    list = <HostSlotList slots={slots} />
  }

  return (
    <div className="space-y-8">
      <HostSummary slots={slotsQuery.data} />

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
