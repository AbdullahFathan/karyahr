import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/tailwind.css'
import '@/styles/globals.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element #root is missing')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
