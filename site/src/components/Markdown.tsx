import { useMemo } from 'react'
import { baseFor, render } from '../lib/markdown'
import { useBody } from '../lib/data'
import { t } from '../i18n/en'

/**
 * Renders a Markdown body fetched from the generated bodies/ directory.
 *
 * dangerouslySetInnerHTML is the only way to mount rendered Markdown, and it is safe here
 * for exactly one reason: `render` sanitizes with DOMPurify. Never pass HTML to this
 * component from anywhere else.
 */
export function Markdown({ path, sourceUrl, empty }: { path: string | null | undefined; sourceUrl?: string | null; empty?: string }) {
  const body = useBody(path)
  const html = useMemo(
    () => (body.status === 'ready' ? render(body.data, baseFor(sourceUrl)) : ''),
    [body, sourceUrl],
  )

  if (body.status === 'loading') return <p className="muted">{t.common.loading}</p>
  if (body.status === 'error') return <p className="muted">{t.common.error}</p>
  if (!body.data.trim()) return <p className="muted">{empty ?? ''}</p>
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
}
