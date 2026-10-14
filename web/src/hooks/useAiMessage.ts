import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * The confirmation text for a new booking. A query rather than a mutation so it
 * runs once per booking even when the component re-mounts; the API stores the
 * first successful result and returns it on later calls.
 */
export function useAiMessage(bookingId: string) {
  return useQuery({
    queryKey: ['bookings', bookingId, 'ai-message'],
    queryFn: () => api.generateAiMessage(bookingId),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
