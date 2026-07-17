import { useMemo, useState } from 'react'
import type { Catalog } from '../lib/data'
import type { ComponentType } from '../types'
import { fmt, t } from '../i18n/en'
import { href, navigate } from '../lib/router'
import { isMac } from '../lib/platform'
import { formatDate } from '../lib/format'

const TYPES: ComponentType[] = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp']
const KEYWORD_CHIPS = 12

export function Home({ catalog }: { catalog: Catalog }) {
  const [query, setQuery] = useState('')
  const { stats, releases, index } = catalog

  // Chips come from what the catalog actually contains, ranked by how many components
  // carry the keyword. Hard-coding them would let them drift from the plugins.
  const keywords = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of index.components) for (const k of c.keywords) counts.set(k, (counts.get(k) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, KEYWORD_CHIPS)
      .map(([k]) => k)
  }, [index])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(href.search(query))
  }

  return (
    <div className="home">
      <section className="hero">
        <h1>{index.marketplace.name}</h1>
        <p className="hero-desc">{index.marketplace.description || t.home.tagline}</p>

        <form className="hero-search" onSubmit={submit} role="search">
          <input
            type="search"
            className="hero-input"
            placeholder={t.home.searchPlaceholder}
            aria-label={t.home.searchLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="button primary">
            {t.nav.search}
          </button>
        </form>

        <p className="muted small">{fmt(t.home.paletteHint, { key: isMac() ? '⌘K' : 'Ctrl+K' })}</p>

        {keywords.length > 0 && (
          <div className="chips" aria-label={t.home.popularKeywords}>
            {keywords.map((k) => (
              <a key={k} className="chip" href={href.search(k)}>
                {k}
              </a>
            ))}
          </div>
        )}
      </section>

      <section aria-label={t.home.browseBy}>
        <div className="stats">
          {TYPES.map((type) => (
            <a key={type} className="stat" href={href.search('', type)} data-empty={stats[plural(type)] === 0}>
              <span className="stat-n">{stats[plural(type)]}</span>
              <span className="stat-label">{t.typesPlural[type]}</span>
            </a>
          ))}
        </div>
        {stats.updatedAt && <p className="muted small center">{fmt(t.home.updated, { date: formatDate(stats.updatedAt) })}</p>}
      </section>

      <section aria-labelledby="whats-new-h">
        <div className="section-head">
          <h2 id="whats-new-h">{t.home.latest}</h2>
          <a href={href.whatsNew()}>{t.home.latestAll}</a>
        </div>
        <ul className="feed">
          {releases.slice(0, 5).map((r) => (
            <li key={`${r.plugin}@${r.version}`}>
              <a href={href.plugin(r.plugin)}>
                <span className="mono">
                  {r.plugin} <strong>{r.version}</strong>
                </span>
                {r.date && <time dateTime={r.date}>{formatDate(r.date)}</time>}
              </a>
              <p className="muted">{r.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** stats.json is keyed by the plural of each type; 'mcp' is its own plural. */
function plural(type: ComponentType): keyof Omit<Catalog['stats'], 'updatedAt'> {
  return type === 'mcp' ? 'mcp' : (`${type}s` as 'plugins')
}
