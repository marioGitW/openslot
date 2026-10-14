import type { UseFormRegisterReturn } from 'react-hook-form'
import { FieldError } from '@/components/common/FieldError'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  CUSTOM_DURATION,
  DURATION_PRESETS,
  DURATION_STEP_MIN,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
} from '@/lib/slots'
import { cn } from '@/lib/utils'

interface DurationFieldProps {
  /** Prefix for the label and error ids. */
  id: string
  /** A preset like `30`, or `custom`. */
  value: string
  onChange: (value: string) => void
  /** The custom minutes input, shown while "Custom" is picked. */
  customInput: UseFormRegisterReturn<'customDuration'>
  error?: string
}

export function DurationField({ id, value, onChange, customInput, error }: DurationFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="space-y-2">
      <Label id={`${id}-label`}>Duration (minutes)</Label>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby={`${id}-label`}
          value={value}
          onValueChange={onChange}
          className="flex-1"
        >
          {[...DURATION_PRESETS, CUSTOM_DURATION].map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className={cn(
                'flex-1 tabular-nums data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
                // Sized to its word, not squeezed to the width of the numbers.
                option === CUSTOM_DURATION && 'flex-none px-4',
              )}
            >
              {option === CUSTOM_DURATION ? 'Custom' : option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {value === CUSTOM_DURATION && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_DURATION_MIN}
              max={MAX_DURATION_MIN}
              step={DURATION_STEP_MIN}
              aria-label="Custom duration in minutes"
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className="w-24 tabular-nums"
              {...customInput}
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        )}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
