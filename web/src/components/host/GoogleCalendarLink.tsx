import { ExternalLink } from 'lucide-react'
import { focusRing } from '@/lib/styles'
import { googleCalendarDayUrl } from '@/lib/time'
import { cn } from '@/lib/utils'

/**
 * Opens the day of `at` in Google Calendar. The API only sees free/busy, so this is
 * where the host sees what the busy time actually is (when signed in as the host).
 */
export function GoogleCalendarLink({ at }: { at: string }) {
  return (
    <a
      href={googleCalendarDayUrl(at)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-1 rounded-sm text-sm font-medium text-link hover:underline',
        focusRing,
      )}
    >
      View in Google Calendar
      <ExternalLink className="size-3.5" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
