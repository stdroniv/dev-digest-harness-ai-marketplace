import { useMemo, useState } from 'react'
import type { Catalog } from '../lib/data'
import type { ComponentType } from '../types'
import { fmt, t } from '../i18n/en'
import { href, useReplace } from '../lib/router'
import { search, useSearchIndex } from '../lib/search'
import { ResultCard } from '../components/ResultCard'

const TYPES: ComponentType[] = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp']

export function Search({ catalog, query: initial, type }: { catalog: Catalog; query: string; type: string | null }) {
  const [query, setQuery] = useState(initial)
  const replace = useReplace()
  const mini = useSearchIndex(catalog.index.components)

  const hits = useMemo(() => search(mini, catalog.byId, query, type), [mini, catalog, query, type])

  // With no query the page lists the catalog rather than sitting empty — a type filter on
  // its own ("show me every agent") is a legitimate way to browse.
  const browse = useMemo(
    () => (query.trim() ? [] : catalog.index.components.filter((c) => !type || c.type === type)),
    [catalog, query, type],
  )

  const onQuery = (next: string) => {
    setQuery(next)
    // replace, not push: every keystroke would otherwise become a back-button step.
    replace(href.search(next, type))
  }

  const count = query.trim() ? hits.length : browse.length

  return (
    <div className="search-page">
      <h1>{t.search.title}</h1>

      <input
        type="search"
        className="hero-input"
        placeholder={t.search.placeholder}
        aria-label={t.home.searchLabel}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        autoFocus
      />

      <div className="filters" role="group" aria-label={t.search.filterByType}>
        <a className="chip" data-active={!type} href={href.search(query)}>
          {t.search.all}
        </a>
        {TYPES.map((ty) => (
          <a key={ty} className="chip" data-active={type === ty} href={href.search(query, ty)}>
            {t.typesPlural[ty]}
          </a>
        ))}
      </div>

      <p className="muted small">{fmt(count === 1 ? t.search.resultCount : t.search.resultCountPlural, { count })}</p>

      {count === 0 ? (
        <div className="empty">
          <p>{query.trim() ? fmt(t.search.empty, { query: `“${query.trim()}”` }) : t.search.prompt}</p>
          {query.trim() && <p className="muted">{t.search.emptyHint}</p>}
        </div>
      ) : (
        <div className="cards">
          {query.trim()
            ? hits.map((h) => <ResultCard key={h.component.id} component={h.component} hit={h} />)
            : browse.map((c) => <ResultCard key={c.id} component={c} />)}
        </div>
      )}
    </div>
  )
}
