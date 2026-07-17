import { useEffect, useMemo, useRef, useState } from 'react'
import type { Catalog } from '../lib/data'
import { search, useSearchIndex } from '../lib/search'
import { href, navigate } from '../lib/router'
import { t } from '../i18n/en'
import { TypeBadge } from './ResultCard'

const MAX = 8

/** Cmd/Ctrl+K from anywhere: jump straight to a plugin, skill or agent. */
export function CommandPalette({ catalog, open, onClose }: { catalog: Catalog; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const mini = useSearchIndex(catalog.index.components)

  const results = useMemo(() => {
    const hits = search(mini, catalog.byId, query).slice(0, MAX)
    // With no query the palette is still useful: it lists the plugins, which is where
    // most people are heading anyway.
    if (query.trim()) return hits.map((h) => h.component)
    return catalog.index.components.filter((c) => c.type === 'plugin').slice(0, MAX)
  }, [mini, catalog, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      input.current?.focus()
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  const go = (i: number) => {
    const target = results[i]
    if (!target) return
    navigate(href.component(target))
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (results.length ? (a + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t.palette.label}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          type="search"
          className="palette-input"
          placeholder={t.palette.placeholder}
          aria-label={t.palette.label}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {results.length === 0 ? (
          <p className="palette-empty">{t.palette.empty}</p>
        ) : (
          <ul className="palette-list" role="listbox">
            {results.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className="palette-item"
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(i)}
                >
                  <span className="palette-name">{c.displayName ?? c.name}</span>
                  {c.type !== 'plugin' && <span className="mono muted">{c.plugin}</span>}
                  <TypeBadge type={c.type} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="palette-hint">{t.palette.hint}</p>
      </div>
    </div>
  )
}
