import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'theme'

const read = (): Theme => {
  // index.html already resolved the theme before first paint; trust what it set so the
  // two halves cannot disagree.
  const set = document.documentElement.dataset.theme
  return set === 'dark' || set === 'light' ? set : 'light'
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(read)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Private mode or a blocked store: the theme still applies for this page load.
    }
  }, [theme])

  // Follow the OS only while the reader has expressed no preference of their own.
  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(KEY)
    } catch {
      /* see above */
    }
    if (stored) return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return [theme, useCallback(() => setTheme((p) => (p === 'dark' ? 'light' : 'dark')), [])]
}
