import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { HostFilter, HostStatusFilter } from '@/lib/slots'
import { DateRangeFilter } from './DateRangeFilter'

const STATUS_OPTIONS: { value: HostStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'booked', label: 'Booked' },
]

interface HostFilterBarProps {
  filter: HostFilter
  onRangeChange: (from: string | null, to: string | null) => void
  onStatusChange: (status: HostStatusFilter) => void
}

/** Wraps to two lines on narrow screens: date range first, status below. */
export function HostFilterBar({ filter, onRangeChange, onStatusChange }: HostFilterBarProps) {
  return (
    <div role="group" aria-label="Filter slots" className="flex flex-wrap items-center gap-2">
      <DateRangeFilter from={filter.from} to={filter.to} onChange={onRangeChange} />
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="Status"
        value={filter.status}
        // Ignore deselecting: one status is always active.
        onValueChange={(value) => value && onStatusChange(value as HostStatusFilter)}
      >
        {STATUS_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
