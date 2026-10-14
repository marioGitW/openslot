import type {
  Booking,
  CalendarStatus,
  CreateBookingInput,
  CreateSlotInput,
  Slot,
  SlotStatusFilter,
} from './types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

interface ErrorBody {
  message?: string | string[]
  error?: string
}

// Our own errors carry a string message; DTO validation errors carry an array.
function readErrorMessage(body: unknown, status: number): string {
  const { message, error } = (body ?? {}) as ErrorBody
  if (Array.isArray(message) && message.length > 0) return message.join('\n')
  if (typeof message === 'string' && message) return message
  if (error) return error
  return `Request failed (${status}).`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init.body
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init.headers,
    })
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection.")
  }

  if (res.status === 204) return undefined as T

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, readErrorMessage(body, res.status))
  return body as T
}

export const api = {
  listSlots: (status: SlotStatusFilter) =>
    request<Slot[]>(`/slots?status=${status}`),

  createSlot: (input: CreateSlotInput) =>
    request<Slot>('/slots', { method: 'POST', body: JSON.stringify(input) }),

  deleteSlot: (id: string) =>
    request<void>(`/slots/${id}`, { method: 'DELETE' }),

  calendarStatus: () => request<CalendarStatus>('/calendar/status'),

  bookSlot: (slotId: string, input: CreateBookingInput) =>
    request<Booking>(`/slots/${slotId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}
