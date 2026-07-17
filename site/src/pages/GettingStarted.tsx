import type { Catalog } from '../lib/data'
import { t } from '../i18n/en'
import { href } from '../lib/router'
import { CommandBlock } from '../components/Copy'

export function GettingStarted({ catalog }: { catalog: Catalog }) {
  const { marketplace } = catalog.index
  const example = catalog.index.components.find((c) => c.type === 'plugin')

  return (
    <div className="detail">
      <h1>{t.gettingStarted.title}</h1>
      <p className="lede">{t.gettingStarted.intro}</p>

      <section>
        <h2>{t.gettingStarted.step1}</h2>
        <p className="muted">{t.gettingStarted.step1Body}</p>
        {marketplace.addCommand && <CommandBlock command={marketplace.addCommand} />}
      </section>

      <section>
        <h2>{t.gettingStarted.step2}</h2>
        <p className="muted">{t.gettingStarted.step2Body}</p>
        {/* The example is a real plugin from the index, so it cannot drift out of date. */}
        {example?.installCommand && <CommandBlock command={example.installCommand} cta={t.common.copyInstall} />}
        <p>
          <a href={href.home()}>{t.common.backHome}</a>
        </p>
      </section>

      <section>
        <h2>{t.gettingStarted.step3}</h2>
        <p className="muted">{t.gettingStarted.step3Body}</p>
        <CommandBlock command="/plugin" />
      </section>

      <section>
        <h2>{t.gettingStarted.updating}</h2>
        <p className="muted">{t.gettingStarted.updatingBody}</p>
        {example && <CommandBlock command={`claude plugin update ${example.name}`} />}
      </section>

      <section>
        <h2>{t.gettingStarted.contributing}</h2>
        <p className="muted">{t.gettingStarted.contributingBody}</p>
        {marketplace.repoUrl && (
          <p>
            <a href={`${marketplace.repoUrl}/blob/${marketplace.branch}/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
              {t.gettingStarted.contributingLink}
            </a>
          </p>
        )}
      </section>
    </div>
  )
}
