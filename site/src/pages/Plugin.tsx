import type { Catalog } from '../lib/data'
import { t } from '../i18n/en'
import { href } from '../lib/router'
import { formatDate } from '../lib/format'
import { CommandBlock } from '../components/Copy'
import { Markdown } from '../components/Markdown'
import { TypeBadge } from '../components/ResultCard'
import { NotFound } from './NotFound'

const GROUPS = ['skills', 'agents', 'commands', 'hooks', 'mcp'] as const

export function Plugin({ catalog, name }: { catalog: Catalog; name: string }) {
  const plugin = catalog.byId.get(`${name}/plugin/${name}`)
  if (!plugin || plugin.type !== 'plugin') return <NotFound />

  const contents = plugin.contents ?? { skills: [], agents: [], commands: [], hooks: [], mcp: [] }
  const deps = plugin.dependencies ?? []
  const dependents = plugin.dependents ?? []

  return (
    <article className="detail">
      <header className="detail-head">
        <div className="detail-title">
          <h1>{plugin.displayName ?? plugin.name}</h1>
          <TypeBadge type="plugin" />
        </div>
        <p className="mono muted">{plugin.name}</p>
        <p className="lede">{plugin.description}</p>

        <dl className="facts">
          {plugin.version && <Fact label={t.plugin.version} value={plugin.version} mono />}
          {plugin.author && <Fact label={t.plugin.owner} value={plugin.author} />}
          {plugin.updatedAt && <Fact label={t.plugin.updated} value={formatDate(plugin.updatedAt)} />}
          {plugin.category && <Fact label={t.plugin.category} value={plugin.category} />}
          {plugin.license && <Fact label={t.plugin.license} value={plugin.license} mono />}
        </dl>

        {plugin.githubUrl && (
          <a className="button" href={plugin.githubUrl} target="_blank" rel="noopener noreferrer">
            {t.common.viewOnGitHub}
          </a>
        )}
      </header>

      <section aria-labelledby="install-h">
        <h2 id="install-h">{t.plugin.install}</h2>
        <p className="muted">{t.plugin.installHint}</p>
        {catalog.index.marketplace.addCommand && <CommandBlock command={catalog.index.marketplace.addCommand} />}
        {plugin.installCommand && <CommandBlock command={plugin.installCommand} cta={t.common.copyInstall} />}
      </section>

      <section aria-labelledby="contents-h">
        <h2 id="contents-h">{t.plugin.contents}</h2>
        {GROUPS.every((g) => contents[g].length === 0) ? (
          <p className="muted">{t.plugin.contentsEmpty}</p>
        ) : (
          GROUPS.filter((g) => contents[g].length > 0).map((g) => (
            <div key={g} className="group">
              <h3>{t.typesPlural[g === 'mcp' ? 'mcp' : (g.slice(0, -1) as 'skill')]}</h3>
              <ul className="list">
                {contents[g].map((id) => {
                  const c = catalog.byId.get(id)
                  return c ? (
                    <li key={id}>
                      <a href={href.artifact(id)}>
                        <span className="mono">{c.name}</span>
                        <span className="muted">{c.description}</span>
                      </a>
                    </li>
                  ) : null
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      {deps.length > 0 && (
        <section aria-labelledby="deps-h">
          <h2 id="deps-h">{t.plugin.dependencies}</h2>
          <p className="muted">{t.plugin.dependenciesHint}</p>
          <ul className="list">
            {deps.map((d) => (
              <li key={d.name}>
                {/* An unresolved dependency has no page in this catalog — linking to one
                    would 404. Name it and say where it lives instead. */}
                {d.resolved ? (
                  <a href={href.plugin(d.name)}>
                    <span className="mono">{d.name}</span>
                    {d.version && <span className="mono muted">{d.version}</span>}
                  </a>
                ) : (
                  <span className="list-static">
                    <span className="mono">{d.name}</span>
                    {d.version && <span className="mono muted">{d.version}</span>}
                    <span className="muted">{d.marketplace ?? t.plugin.unresolvedDep}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dependents.length > 0 && (
        <section aria-labelledby="dependents-h">
          <h2 id="dependents-h">{t.plugin.dependents}</h2>
          <ul className="list">
            {dependents.map((n) => (
              <li key={n}>
                <a href={href.plugin(n)}>
                  <span className="mono">{n}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plugin.compatibilityPath && (
        <section aria-labelledby="compat-h">
          <h2 id="compat-h">{t.plugin.compatibility}</h2>
          <p className="muted">{t.plugin.compatibilityNote}</p>
          <Markdown path={plugin.compatibilityPath} sourceUrl={plugin.githubUrl} />
        </section>
      )}

      <section aria-labelledby="readme-h">
        <h2 id="readme-h">{t.plugin.readme}</h2>
        <Markdown path={plugin.bodyPath} sourceUrl={plugin.githubUrl} empty={t.plugin.noReadme} />
      </section>
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
