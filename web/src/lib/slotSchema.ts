import { z } from 'zod'

// Mirrors CreateSlotDto in the API; date + time are combined into `startsAt` on submit.
export const slotSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, 'Use at least 3 characters.')
    .max(60, 'Use 60 characters or fewer.'),
  date: z.string().min(1, 'Pick a date.'),
  time: z.string().min(1, 'Pick a start time.'),
  duration: z.enum(['15', '30', '45', '60']),
})

export type SlotFormInput = z.input<typeof slotSchema>
export type SlotFormValues = z.output<typeof slotSchema>
