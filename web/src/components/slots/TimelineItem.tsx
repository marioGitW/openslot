import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { timelineDotY } from './slotRowStyles'

export type TimelineDot = 'open' | 'conflict' | 'selected' | 'booked'

const DOT_CLASS: Record<TimelineDot, string> = {
  open: 'border-primary bg-background',
  conflict: 'border-destructive bg-background',
  selected: 'border-primary bg-primary',
  booked: 'border-muted-foreground bg-muted-foreground',
}

interface TimelineItemProps extends ComponentProps<'li'> {
  dot: TimelineDot
}

/**
 * A row on the dot-and-line timeline. The fixed 24px gutter holds a 10px dot level
 * with the card's time; the line runs from this dot to the next row's dot, so it
 * starts at the first row and stops at the last. Rows must sit flush (put the gap
 * inside the item) for the line to meet the next dot.
 */
export function TimelineItem({ dot, className, children, ...props }: TimelineItemProps) {
  return (
    <li
      className={cn(
        'relative pl-6',
        timelineDotY,
        'before:absolute before:top-(--dot-y) before:-bottom-(--dot-y) before:left-[4.5px] before:w-px before:bg-border last:before:hidden',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[calc(var(--dot-y)-5px)] left-0 size-2.5 rounded-full border-2 transition-colors',
          DOT_CLASS[dot],
        )}
      />
      {children}
    </li>
  )
}
