import { z } from 'zod'

// Mirrors CreateBookingDto in the API.
export const NOTE_MAX = 300

export const bookingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your name (at least 2 characters).')
    .max(80, 'Use 80 characters or fewer.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address.')),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX, `Keep it under ${NOTE_MAX} characters.`),
})

export type BookingFormInput = z.input<typeof bookingSchema>
export type BookingFormValues = z.output<typeof bookingSchema>

export const emptyBookingForm: BookingFormInput = { name: '', email: '', note: '' }
