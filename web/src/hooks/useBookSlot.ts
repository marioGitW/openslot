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
    // Also refetch after a 409, so the slot someone else took disappears. Not
    // awaited: the caller's onSuccess runs right away and can animate the booked
    // row out before the refetch drops it.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: slotKeys.all })
    },
  })
}
