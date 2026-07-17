import { useEffect, useState } from 'react'
import type { Component, Index, Release, Stats } from '../types'

// Generated files are served as static assets under the Pages base path. Everything the
// app knows comes from these three files plus bodies/ — there is no backend and no
// GitHub API call at runtime.
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(asset(path))
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export interface Catalog {
  index: Index
  releases: Release[]
  stats: Stats
  /** Every component by id — every page looks components up this way. */
  byId: Map<string, Component>
}

let cached: Promise<Catalog> | null = null

/** Loads the catalog once per page load and shares it across every route. */
export function loadCatalog(): Promise<Catalog> {
  cached ??= (async () => {
    const [index, releases, stats] = await Promise.all([
      fetchJson<Index>('index.json'),
      fetchJson<Release[]>('releases.json'),
      fetchJson<Stats>('stats.json'),
    ])
    return { index, releases, stats, byId: new Map(index.components.map((c) => [c.id, c])) }
  })()
  return cached
}

type Async<T> = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: T }

export function useCatalog(): Async<Catalog> {
  const [state, setState] = useState<Async<Catalog>>({ status: 'loading' })
  useEffect(() => {
    let live = true
    loadCatalog().then(
      (data) => live && setState({ status: 'ready', data }),
      (error: Error) => live && setState({ status: 'error', error }),
    )
    return () => {
      live = false
    }
  }, [])
  return state
}

/** Fetches one Markdown body. Bodies are per-page so index.json stays small. */
export function useBody(path: string | null | undefined): Async<string> {
  const [state, setState] = useState<Async<string>>({ status: 'loading' })
  useEffect(() => {
    if (!path) {
      setState({ status: 'ready', data: '' })
      return
    }
    let live = true
    setState({ status: 'loading' })
    fetch(asset(path))
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`${path}: ${res.status}`))))
      .then(
        (data) => live && setState({ status: 'ready', data }),
        (error: Error) => live && setState({ status: 'error', error }),
      )
    return () => {
      live = false
    }
  }, [path])
  return state
}
