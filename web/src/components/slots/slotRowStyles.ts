/** Card look shared by the booking rail rows and the host's slots. */
export const slotRowClass =
  'flex w-full items-start justify-between gap-4 rounded-md border bg-card px-4 py-3 text-left text-card-foreground'

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

/**
 * Timeline dot position: from the row's top to the middle of the time text, i.e.
 * card offset (`--card-top`, set by lists that pad the card) + 1px border + py-3 +
 * half of `slotTimeClass`'s line height (1.25rem or 1.5rem × leading-tight 1.25).
 */
export const timelineDotY =
  '[--dot-y:calc(var(--card-top,0px)+1px+0.75rem+0.78125rem)] md:[--dot-y:calc(var(--card-top,0px)+1px+0.75rem+0.9375rem)]'
