import { useSearchParams } from 'react-router-dom'
import type { HostFilter, HostStatusFilter } from '@/lib/slots'
import { isDayKey } from '@/lib/time'

function parseStatus(value: string | null): HostStatusFilter {
  return value === 'open' || value === 'booked' || value === 'conflicts' ? value : 'all'
}

/** Reads the filter from `?from=&to=&status=`; anything malformed falls back to "all". */
function parseFilter(params: URLSearchParams): HostFilter {
  const status = parseStatus(params.get('status'))
  const fromParam = params.get('from')
  const toParam = params.get('to')
  const from = isDayKey(fromParam) ? fromParam : null
  const to = isDayKey(toParam) ? toParam : null
  // One valid end means a single day; a reversed range is swapped.
  const start = from ?? to
  const end = to ?? from
  if (!start || !end) return { from: null, to: null, status }
  return start <= end ? { from: start, to: end, status } : { from: end, to: start, status }
}

/** Host view filter kept in the URL, so it survives a refresh and can be shared. */
export function useHostFilters() {
  const [params, setParams] = useSearchParams()
  const filter = parseFilter(params)

  function update(next: HostFilter) {
    const nextParams = new URLSearchParams()
    if (next.from && next.to) {
      nextParams.set('from', next.from)
      nextParams.set('to', next.to)
    }
    if (next.status !== 'all') nextParams.set('status', next.status)
    setParams(nextParams, { replace: true })
  }

  return {
    filter,
    setRange: (from: string | null, to: string | null) => update({ ...filter, from, to }),
    setStatus: (status: HostStatusFilter) => update({ ...filter, status }),
    clear: () => update({ from: null, to: null, status: 'all' }),
  }
}
