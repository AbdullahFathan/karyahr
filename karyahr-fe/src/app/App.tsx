import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/app/providers/query-provider'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'

export function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <RouterProvider router={router} />
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}
