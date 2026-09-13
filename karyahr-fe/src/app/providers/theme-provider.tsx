import { useLayoutEffect, type ReactNode } from 'react'

type ThemeProviderProps = {
  readonly children: ReactNode
}

/** Light-only. There is no dark theme or theme switcher. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useLayoutEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
  }, [])

  return children
}
