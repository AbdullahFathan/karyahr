import { useCallback, useState } from 'react'
import { storage } from '@/lib/storage'

export function useLocalStorage(key: string, initialValue: string): [string, (next: string) => void] {
  const [value, setValue] = useState(() => storage.get(key) ?? initialValue)

  const update = useCallback(
    (next: string) => {
      setValue(next)
      storage.set(key, next)
    },
    [key],
  )

  return [value, update]
}
