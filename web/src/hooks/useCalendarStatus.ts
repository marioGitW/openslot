import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCalendarStatus() {
  return useQuery({
    queryKey: ['calendar-status'],
    queryFn: api.calendarStatus,
    // The API caches Google's answer for a minute, so asking more often adds nothing.
    staleTime: 60_000,
  })
}
