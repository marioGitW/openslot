import { Card, CardContent } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BookingPanelContent, type BookingPanelContentProps } from './BookingPanelContent'

interface BookingPanelProps extends BookingPanelContentProps {
  /** Only used by the sheet and drawer layouts. */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** ≥1024px: sticky card. 768–1023px: right sheet. <768px: bottom drawer. */
export function BookingPanel({ open, onOpenChange, ...content }: BookingPanelProps) {
  if (content.layout === 'card') {
    return (
      <Card className="w-full">
        <CardContent>
          <BookingPanelContent {...content} />
        </CardContent>
      </Card>
    )
  }

  if (content.layout === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          className="w-full gap-0 data-[side=right]:sm:max-w-[420px]"
        >
          <SheetHeader className="px-4 pt-5 pr-14 pb-4">
            <SheetTitle className="text-base">Book a time</SheetTitle>
          </SheetHeader>
          <BookingPanelContent {...content} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        aria-describedby={undefined}
        className="data-[vaul-drawer-direction=bottom]:max-h-[90vh]"
      >
        <DrawerHeader className="px-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle className="text-base">Book a time</DrawerTitle>
        </DrawerHeader>
        <BookingPanelContent {...content} />
      </DrawerContent>
    </Drawer>
  )
}
