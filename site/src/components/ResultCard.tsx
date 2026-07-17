import type { Component } from '../types'
import { t } from '../i18n/en'
import { href } from '../lib/router'
import { highlight, snippet, type Hit } from '../lib/search'

export function TypeBadge({ type }: { type: Component['type'] }) {
  return (
    <span className="badge" data-type={type}>
      {t.types[type]}
    </span>
  )
}

function Marked({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlight(text, terms).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  )
}

/** One search result, or one entry in a list of components. `hit` adds match highlighting. */
export function ResultCard({ component, hit }: { component: Component; hit?: Hit }) {
  const terms = hit?.terms ?? []
  const body = hit ? snippet(component, terms) : null
  const title = component.displayName ?? component.name

  return (
    <a className="card" href={href.component(component)}>
      <div className="card-head">
        <h3>
          <Marked text={title} terms={terms} />
        </h3>
        <TypeBadge type={component.type} />
      </div>

      <p className="card-desc">
        <Marked text={component.description} terms={terms} />
      </p>

      {body && (
        <p className="card-snippet">
          <Marked text={body} terms={terms} />
        </p>
      )}

      <div className="card-meta">
        {component.type !== 'plugin' && <span className="mono">{component.plugin}</span>}
        {component.version && <span className="mono">v{component.version}</span>}
        {component.invocation && <span className="mono">{component.invocation}</span>}
        {component.keywords.slice(0, 3).map((k) => (
          <span key={k} className="chip-sm">
            {k}
          </span>
        ))}
      </div>
    </a>
  )
}
