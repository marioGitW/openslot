import { useEffect, useRef, useState } from 'react'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'

/** A note clamped to two lines, with "Show more" only when it actually overflows. */
export function ExpandableNote({ note }: { note: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    const observer = new ResizeObserver(() => {
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded, note])

  return (
    <div className="text-sm">
      <p ref={ref} className={cn('text-pretty break-words', !expanded && 'line-clamp-2')}>
        {note}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className={cn(
            '-mx-1 mt-0.5 inline-flex min-h-11 items-center rounded-md px-1 font-medium text-link hover:underline',
            focusRing,
          )}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
