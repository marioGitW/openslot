import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SlotStatusFilter } from '@/lib/types'

export const slotKeys = {
  all: ['slots'] as const,
  list: (status: SlotStatusFilter) => ['slots', status] as const,
}

interface UseSlotsOptions {
  /** Poll interval in ms, e.g. so booked slots disappear from the booking page. */
  refetchInterval?: number
}

export function useSlots(status: SlotStatusFilter, options: UseSlotsOptions = {}) {
  return useQuery({
    queryKey: slotKeys.list(status),
    queryFn: () => api.listSlots(status),
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: true,
  })
}
