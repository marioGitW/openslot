import { useId, useState } from 'react'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'

/** Gemini's prep points for a booking; collapsed on mobile to keep rows short. */
export function PrepAgenda({ items }: { items: string[] }) {
  const isDesktop = useMediaQuery(MEDIA.md)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const expanded = isDesktop || open

  return (
    <div className="text-sm">
      {isDesktop ? (
        <p className="pt-1 font-medium">Prep agenda</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            '-mx-1 inline-flex min-h-11 items-center rounded-md px-1 font-medium text-link hover:underline',
            focusRing,
          )}
        >
          {open ? 'Hide prep agenda' : 'Show prep agenda'}
        </button>
      )}
      {expanded && (
        <ol id={listId} className="mt-0.5 list-decimal space-y-0.5 pl-5 text-pretty">
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
