import { t } from '../i18n/en'
import { href } from '../lib/router'

export function NotFound() {
  return (
    <div className="empty">
      <h1>{t.common.notFound}</h1>
      <p className="muted">{t.common.notFoundBody}</p>
      <p>
        <a href={href.home()}>{t.common.backHome}</a>
      </p>
    </div>
  )
}
