import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'

// Hash routing, because GitHub Pages serves static files and has no rewrite rule: a real
// path like /plugin/foo would 404 on reload and on every shared deep link. The hash never
// reaches the server, so every route survives a refresh.
//
// Routes:
//   #/                                  home
//   #/search?q=…&type=…                 search
//   #/plugin/<name>                     plugin detail
//   #/artifact/<plugin>/<type>/<name>   skill / agent / command / hook / MCP detail
//   #/whats-new
//   #/getting-started

export type Route =
  | { name: 'home' }
  | { name: 'search'; query: string; type: string | null }
  | { name: 'plugin'; plugin: string }
  | { name: 'artifact'; id: string }
  | { name: 'whats-new' }
  | { name: 'getting-started' }
  | { name: 'not-found' }

export function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart = '', queryPart = ''] = raw.split('?')
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent)
  const params = new URLSearchParams(queryPart)

  if (segments.length === 0) return { name: 'home' }
  switch (segments[0]) {
    case 'search':
      return { name: 'search', query: params.get('q') ?? '', type: params.get('type') }
    case 'plugin':
      return segments.length === 2 && segments[1] ? { name: 'plugin', plugin: segments[1] } : { name: 'not-found' }
    case 'artifact':
      // <plugin>/<type>/<name> — the component id, kept as path segments so no escaping
      // is needed and the URL stays readable.
      return segments.length === 4 ? { name: 'artifact', id: segments.slice(1).join('/') } : { name: 'not-found' }
    case 'whats-new':
      return { name: 'whats-new' }
    case 'getting-started':
      return { name: 'getting-started' }
    default:
      return { name: 'not-found' }
  }
}

export const href = {
  home: () => '#/',
  search: (query = '', type: string | null = null) => {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (type) p.set('type', type)
    const qs = p.toString()
    return `#/search${qs ? `?${qs}` : ''}`
  },
  plugin: (name: string) => `#/plugin/${name}`,
  artifact: (id: string) => `#/artifact/${id}`,
  whatsNew: () => '#/whats-new',
  gettingStarted: () => '#/getting-started',
  /** The route for any component, whichever kind it is. */
  component: (c: { type: string; name: string; id: string }) =>
    c.type === 'plugin' ? href.plugin(c.name) : href.artifact(c.id),
}

const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => location.hash,
    () => '#/',
  )
  // Memoized so the identity is stable across re-renders. Callers use the route as an
  // effect dependency; a fresh object every render would re-fire those effects on every
  // unrelated state change.
  const route = useMemo(() => parse(hash), [hash])

  // A new page starts at the top; without this, opening a result from halfway down a
  // long list lands mid-document.
  useEffect(() => {
    scrollTo(0, 0)
  }, [route])

  return route
}

/** Replaces the hash without a history entry — for typing in the search box, where every
 *  keystroke would otherwise become a back-button step. */
export function useReplace() {
  return useCallback((h: string) => {
    history.replaceState(null, '', h)
    dispatchEvent(new HashChangeEvent('hashchange'))
  }, [])
}

export function navigate(h: string) {
  location.hash = h
}
