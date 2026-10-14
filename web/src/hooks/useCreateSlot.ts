import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateSlotInput } from '@/lib/types'
import { slotKeys } from './useSlots'

export function useCreateSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSlotInput) => api.createSlot(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: slotKeys.all }),
  })
}
