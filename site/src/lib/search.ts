import MiniSearch from 'minisearch'
import { useMemo } from 'react'
import type { Component } from '../types'

// Search runs entirely in the browser against the generated index: no backend, no GitHub
// API, no rate limit, and it works offline once the page is cached.

export interface Hit {
  component: Component
  score: number
  /** Query terms that actually matched, lowercased — what the UI highlights. */
  terms: string[]
}

const FIELDS = ['name', 'displayName', 'description', 'keywords', 'plugin', 'invocation', 'searchText']

function build(components: Component[]): MiniSearch<Component> {
  const mini = new MiniSearch<Component>({
    idField: 'id',
    fields: FIELDS,
    storeFields: ['id'],
    extractField: (doc, field) => {
      const v = (doc as unknown as Record<string, unknown>)[field]
      return Array.isArray(v) ? v.join(' ') : ((v ?? '') as string)
    },
    searchOptions: {
      prefix: true,
      // Fuzziness scaled to term length: a 4-letter term tolerates one edit, and short
      // terms tolerate none — otherwise every 3-letter query matches half the catalog.
      fuzzy: (term) => (term.length > 5 ? 0.2 : term.length > 3 ? 0.1 : false),
      combineWith: 'AND',
      boost: { name: 6, displayName: 4, keywords: 3, description: 2, invocation: 3, searchText: 1 },
    },
  })
  mini.addAll(components)
  return mini
}

export function useSearchIndex(components: Component[]): MiniSearch<Component> {
  return useMemo(() => build(components), [components])
}

export function search(mini: MiniSearch<Component>, byId: Map<string, Component>, query: string, type?: string | null): Hit[] {
  const q = query.trim()
  if (!q) return []
  return mini
    .search(q)
    .flatMap((r) => {
      const component = byId.get(r.id as string)
      if (!component) return []
      if (type && component.type !== type) return []
      return [{ component, score: r.score, terms: r.terms.map((t) => t.toLowerCase()) }]
    })
}

/** Splits text into matched and unmatched runs so the UI can mark the matches. Returns
 *  plain data rather than markup — highlighting must never inject HTML into a page that
 *  also renders repository Markdown. */
export function highlight(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (!terms.length || !text) return [{ text, match: false }]
  const escaped = terms
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return [{ text, match: false }]

  // Split on a capturing group so the matches survive in the output. Whether a part is a
  // match is then a plain lookup — reusing the /g regex with .test() here would be a bug:
  // it carries lastIndex between calls and would report every other match as a miss.
  const matched = new Set(terms.map((t) => t.toLowerCase()))
  return text
    .split(new RegExp(`(${escaped.join('|')})`, 'gi'))
    .filter(Boolean)
    .map((part) => ({ text: part, match: matched.has(part.toLowerCase()) }))
}

/** A snippet of body text around the first match, so a result explains why it matched
 *  rather than just repeating its description. */
export function snippet(component: Component, terms: string[], length = 180): string | null {
  const text = component.searchText
  if (!text || !terms.length) return null
  const lower = text.toLowerCase()
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0]
  if (at === undefined) return null
  // Do not repeat the description back at the reader as if it were a body match.
  if (component.description.toLowerCase().includes(text.slice(at, at + 30).toLowerCase())) return null

  const start = Math.max(0, at - length / 3)
  const end = Math.min(text.length, start + length)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}
