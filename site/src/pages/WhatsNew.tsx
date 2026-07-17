import type { Catalog } from '../lib/data'
import { t } from '../i18n/en'
import { href } from '../lib/router'
import { formatDate } from '../lib/format'
import { render } from '../lib/markdown'

export function WhatsNew({ catalog }: { catalog: Catalog }) {
  const { releases } = catalog

  return (
    <div className="detail">
      <h1>{t.whatsNew.title}</h1>
      <p className="lede">{t.whatsNew.intro}</p>

      {releases.length === 0 ? (
        <p className="muted">{t.whatsNew.empty}</p>
      ) : (
        <ol className="releases">
          {releases.map((r) => {
            const plugin = catalog.byId.get(`${r.plugin}/plugin/${r.plugin}`)
            return (
              <li key={`${r.plugin}@${r.version}`}>
                <div className="release-head">
                  <h2>
                    <a href={href.plugin(r.plugin)}>{r.plugin}</a> <span className="mono">{r.version}</span>
                  </h2>
                  {r.date && (
                    // A date read from the CHANGELOG is a fact; one inferred from the last
                    // commit is not, and is labelled rather than dressed up as one.
                    <time dateTime={r.date} title={r.dateIsExact ? undefined : t.whatsNew.approxDate}>
                      {r.dateIsExact ? '' : '~'}
                      {formatDate(r.date)}
                    </time>
                  )}
                </div>
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: render(r.body, plugin?.githubUrl) }}
                />
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
