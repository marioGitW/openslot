import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const ORDER = ['light', 'dark', 'system'] as const
type ThemeChoice = (typeof ORDER)[number]

const LABELS: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const ICONS: Record<ThemeChoice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: SunMoon,
}

function toChoice(theme: string | undefined): ThemeChoice {
  return theme === 'light' || theme === 'dark' ? theme : 'system'
}

interface ThemeToggleProps {
  /** Show "Theme: Dark" next to the icon (used in the mobile menu). */
  showLabel?: boolean
}

export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const current = toChoice(theme)
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  const Icon = ICONS[current]
  const label = `Theme: ${LABELS[current]}. Switch to ${LABELS[next].toLowerCase()}.`

  if (showLabel) {
    return (
      <Button
        variant="ghost"
        className="h-12 w-full justify-start gap-3 px-3 text-base font-normal"
        onClick={() => setTheme(next)}
        aria-label={label}
      >
        <Icon className="size-5" aria-hidden />
        Theme: {LABELS[current]}
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  )
}
