import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { BookingPage } from '@/pages/BookingPage'
import { HostPage } from '@/pages/HostPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <BookingPage /> },
      { path: '/host', element: <HostPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
