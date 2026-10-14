/** Card look shared by the booking rail rows and the host's open slots. */
export const slotRowClass =
  'flex w-full items-center justify-between gap-4 rounded-md border border-l-[3px] border-l-primary bg-card px-4 py-3 text-left text-card-foreground'

// Row height grows with duration (min 56px), capped so long slots stay compact.
export function slotRowHeight(durationMin: number): string {
  if (durationMin <= 15) return 'min-h-14'
  if (durationMin <= 30) return 'min-h-18'
  if (durationMin <= 45) return 'min-h-22'
  return 'min-h-26'
}

/** `14:30–15:00` in large tabular numerals. */
export const slotTimeClass =
  'text-xl leading-tight font-semibold tabular-nums md:text-2xl'
