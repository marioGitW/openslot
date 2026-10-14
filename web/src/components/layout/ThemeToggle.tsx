import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  /** Show the label next to the icon (used in the mobile menu). */
  showLabel?: boolean
}

/**
 * Two states. Until the first click the stored theme is "system" and the OS decides;
 * each click switches to the opposite of what is shown and saves it.
 */
export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  // resolvedTheme can be undefined for a moment; the pre-paint class is the truth then.
  const isDark = resolvedTheme
    ? resolvedTheme === 'dark'
    : document.documentElement.classList.contains('dark')
  const next = isDark ? 'light' : 'dark'
  const Icon = isDark ? Sun : Moon
  const label = `Switch to ${next} theme`

  if (showLabel) {
    return (
      <Button
        variant="ghost"
        className="h-12 w-full justify-start gap-3 px-3 text-base font-normal"
        onClick={() => setTheme(next)}
      >
        <Icon className="size-5" aria-hidden />
        {label}
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
