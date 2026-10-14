import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind breakpoints used for layout switches. */
export const MEDIA = {
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const
