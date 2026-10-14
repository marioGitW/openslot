import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateBookingInput } from '@/lib/types'
import { slotKeys } from './useSlots'

interface BookSlotVariables {
  slotId: string
  input: CreateBookingInput
}

export function useBookSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slotId, input }: BookSlotVariables) =>
      api.bookSlot(slotId, input),
    // Also refetch after a 409, so the slot someone else took disappears.
    onSettled: () => queryClient.invalidateQueries({ queryKey: slotKeys.all }),
  })
}
