import { z } from 'zod'
import { CUSTOM_DURATION, DURATION_MESSAGE, DURATION_PRESETS, resolveDuration } from './slots'

// Mirrors CreateSlotDto in the API; date + time are combined into `startsAt` and the
// duration choice is resolved to minutes on submit.
export const slotSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .min(1, 'Topic is required.')
      .min(3, 'Topic must be at least 3 characters.')
      .max(60, 'Use 60 characters or fewer.'),
    date: z.string().min(1, 'Pick a date.'),
    time: z.string().min(1, 'Pick a start time.'),
    duration: z.enum([...DURATION_PRESETS, CUSTOM_DURATION]),
    customDuration: z.string(),
  })
  .superRefine((values, ctx) => {
    if (resolveDuration(values.duration, values.customDuration) === null) {
      ctx.addIssue({ code: 'custom', path: ['customDuration'], message: DURATION_MESSAGE })
    }
  })

export type SlotFormInput = z.input<typeof slotSchema>
export type SlotFormValues = z.output<typeof slotSchema>
