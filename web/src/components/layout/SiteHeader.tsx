import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { focusRing } from '@/lib/styles'
import { MobileMenu } from './MobileMenu'
import { navLinks } from './navLinks'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className={cn(
            '-mx-2 inline-flex h-11 items-center rounded-md px-2 text-lg font-semibold tracking-tight',
            focusRing,
          )}
        >
          OpenSlot
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <nav aria-label="Main" className="flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors',
                    focusRing,
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>

        <div className="md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
