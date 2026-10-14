import { Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { MEDIA, useMediaQuery } from '@/hooks/useMediaQuery'
import { SiteHeader } from './SiteHeader'

export function AppLayout() {
  const isDesktop = useMediaQuery(MEDIA.md)

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <Outlet />
      </main>
      <Toaster position={isDesktop ? 'bottom-right' : 'top-center'} />
    </div>
  )
}
