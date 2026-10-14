import { Menu } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { focusRing } from '@/lib/styles'
import { navLinks } from './navLinks'
import { ThemeToggle } from './ThemeToggle'

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-6" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-72 gap-0 p-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="h-16 justify-center border-b px-4">
          <SheetTitle className="text-base">Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Main" className="flex flex-col gap-1 p-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex h-12 items-center rounded-md px-3 text-base',
                  focusRing,
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-2">
          <Separator className="mb-2" />
          <ThemeToggle showLabel />
        </div>
      </SheetContent>
    </Sheet>
  )
}
