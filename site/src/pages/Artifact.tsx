import type { Catalog } from '../lib/data'
import { fmt, t } from '../i18n/en'
import { href } from '../lib/router'
import { formatDate } from '../lib/format'
import { CommandBlock } from '../components/Copy'
import { Markdown } from '../components/Markdown'
import { TypeBadge } from '../components/ResultCard'
import { NotFound } from './NotFound'

/** The deep-link page for anything a plugin ships: skill, agent, command, hook, MCP server. */
export function Artifact({ catalog, id }: { catalog: Catalog; id: string }) {
  const c = catalog.byId.get(id)
  if (!c || c.type === 'plugin') return <NotFound />

  const parent = catalog.byId.get(`${c.plugin}/plugin/${c.plugin}`)

  return (
    <article className="detail">
      <header className="detail-head">
        <div className="detail-title">
          <h1>{c.displayName ?? c.name}</h1>
          <TypeBadge type={c.type} />
        </div>
        <p className="muted">
          <a href={href.plugin(c.plugin)}>{fmt(t.artifact.partOf, { plugin: c.plugin })}</a>
        </p>
        <p className="lede">{c.description}</p>

        <dl className="facts">
          {c.model && <Fact label={t.artifact.model} value={c.model} mono />}
          {c.updatedAt && <Fact label={t.plugin.updated} value={formatDate(c.updatedAt)} />}
          {parent?.version && <Fact label={t.plugin.version} value={parent.version} mono />}
        </dl>

        {c.githubUrl && (
          <a className="button" href={c.githubUrl} target="_blank" rel="noopener noreferrer">
            {t.common.viewOnGitHub}
          </a>
        )}
      </header>

      <section aria-labelledby="invoke-h">
        <h2 id="invoke-h">{t.artifact.invocation}</h2>
        {c.invocation ? (
          <>
            <CommandBlock command={c.invocation} />
            {c.type === 'skill' && <p className="muted">{t.artifact.invocationHintSkill}</p>}
          </>
        ) : (
          <p className="muted">{c.type === 'agent' ? t.artifact.invocationHintAgent : t.artifact.invocationHintSkill}</p>
        )}
      </section>

      {/* Tools are the permissions this component runs with — the thing to read before
          installing it, since plugins run unsandboxed. */}
      <section aria-labelledby="tools-h">
        <h2 id="tools-h">{t.artifact.tools}</h2>
        {c.tools.length > 0 ? (
          <div className="chips">
            {c.tools.map((tool) => (
              <span key={tool} className="chip-sm mono">
                {tool}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">{t.artifact.noTools}</p>
        )}
      </section>

      {parent?.installCommand && (
        <section aria-labelledby="install-h">
          <h2 id="install-h">{t.artifact.installParent}</h2>
          {catalog.index.marketplace.addCommand && <CommandBlock command={catalog.index.marketplace.addCommand} />}
          <CommandBlock command={parent.installCommand} cta={t.common.copyInstall} />
        </section>
      )}

      <section aria-labelledby="body-h">
        <h2 id="body-h">{t.artifact.body}</h2>
        <Markdown path={c.bodyPath} sourceUrl={c.githubUrl} />
      </section>

      <p className="muted small mono">
        {t.artifact.source}: {c.sourcePath}
      </p>
    </article>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{value}</dd>
    </div>
  )
}
