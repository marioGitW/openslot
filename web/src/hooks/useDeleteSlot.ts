import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { slotKeys } from './useSlots'

export function useDeleteSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSlot(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: slotKeys.all }),
  })
}
