import { CalendarIcon } from 'lucide-react'
import { useState, type Ref } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDayShort, keyToPickerDate, pickerDateToKey } from '@/lib/time'
import { cn } from '@/lib/utils'

interface DatePickerFieldProps {
  id: string
  /** Skopje day as `yyyy-MM-dd`, or empty. */
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  /** Earliest day that can be picked, as `yyyy-MM-dd`. */
  minDay: string
  invalid: boolean
  describedBy?: string
  ref?: Ref<HTMLButtonElement>
}

export function DatePickerField({
  id,
  value,
  onChange,
  onBlur,
  minDay,
  invalid,
  describedBy,
  ref,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          variant="outline"
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onBlur={onBlur}
        >
          <CalendarIcon aria-hidden />
          {value ? formatDayShort(value) : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? keyToPickerDate(value) : undefined}
          defaultMonth={value ? keyToPickerDate(value) : undefined}
          disabled={{ before: keyToPickerDate(minDay) }}
          weekStartsOn={1}
          onSelect={(picked) => {
            if (!picked) return
            onChange(pickerDateToKey(picked))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
