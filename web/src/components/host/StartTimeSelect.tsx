import { useRef, type FocusEvent, type Ref } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StartTimeSelectProps {
  id: string
  value: string
  /** `HH:mm` times to offer, in order. */
  options: string[]
  onChange: (value: string) => void
  onBlur: () => void
  /** Times that can't be picked, e.g. ones already past today. */
  isDisabled: (time: string) => boolean
  invalid: boolean
  describedBy?: string
  ref?: Ref<HTMLButtonElement>
}

/**
 * Radix moves focus to the content when nothing is selected yet; send it on to the
 * first time that can still be picked and scroll the list there.
 */
function focusFirstAvailable(event: FocusEvent<HTMLDivElement>) {
  const option = event.currentTarget.querySelector<HTMLElement>(
    '[role="option"]:not([data-disabled])',
  )
  const viewport = option?.closest<HTMLElement>('[data-radix-select-viewport]')
  if (!option || !viewport) return
  viewport.scrollTop = option.offsetTop - 4
  option.focus({ preventScroll: true })
}

export function StartTimeSelect({
  id,
  value,
  options,
  onChange,
  onBlur,
  isDisabled,
  invalid,
  describedBy,
  ref,
}: StartTimeSelectProps) {
  // Radix also focuses the content whenever the pointer leaves an item (e.g. while
  // scrolling), so only the first focus after opening may move the list.
  const positioned = useRef(false)

  function handleContentFocus(event: FocusEvent<HTMLDivElement>) {
    if (positioned.current) return
    positioned.current = true
    // With a value, Radix focuses the selected item first; leave the list there.
    if (event.target === event.currentTarget) focusFirstAvailable(event)
  }

  return (
    <Select
      value={value}
      onValueChange={onChange}
      onOpenChange={(open) => {
        if (open) positioned.current = false
      }}
    >
      <SelectTrigger
        ref={ref}
        id={id}
        className="w-full tabular-nums"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onBlur={onBlur}
      >
        <SelectValue placeholder="Pick a time" />
      </SelectTrigger>
      {/* Opens below the field, as wide as it, about six rows tall. */}
      <SelectContent
        position="popper"
        className="max-h-60 w-(--radix-select-trigger-width) min-w-0"
        onFocus={handleContentFocus}
      >
        {options.map((option) => (
          <SelectItem
            key={option}
            value={option}
            className="tabular-nums"
            disabled={isDisabled(option)}
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
