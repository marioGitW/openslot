import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateSlotInput } from '@/lib/types'
import { slotKeys } from './useSlots'

export function useUpdateSlot(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSlotInput) => api.updateSlot(id, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: slotKeys.all }),
  })
}
