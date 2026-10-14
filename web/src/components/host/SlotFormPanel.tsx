import type { ReactNode } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'

interface SlotFormPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

/** A side sheet from md up, a bottom drawer on phones. */
export function SlotFormPanel({ open, onOpenChange, title, children }: SlotFormPanelProps) {
  const isMd = useMediaQuery(MEDIA.md)

  if (isMd) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-[420px]"
        >
          <SheetHeader className="px-4 pt-5 pr-14 pb-4">
            <SheetTitle className="text-base">{title}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{children}</div>
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
          <DrawerTitle className="text-base">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
