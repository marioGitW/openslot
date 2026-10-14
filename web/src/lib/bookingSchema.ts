import { z } from 'zod'

// Mirrors CreateBookingDto in the API.
export const NOTE_MAX = 300

export const bookingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Use 80 characters or fewer.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .pipe(z.email('Enter a valid email address.')),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX, `Keep the note under ${NOTE_MAX} characters.`),
})

export type BookingFormInput = z.input<typeof bookingSchema>
export type BookingFormValues = z.output<typeof bookingSchema>

export const emptyBookingForm: BookingFormInput = { name: '', email: '', note: '' }
