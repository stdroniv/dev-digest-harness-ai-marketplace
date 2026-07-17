import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Repository Markdown is written by plugin authors and coding agents, and it is rendered
// into this page as HTML. Everything marked produces is sanitized before it reaches the
// DOM — no exception, no "trusted" source. Markdown permits raw HTML, so parsing alone is
// not a safety boundary.

marked.setOptions({ gfm: true, breaks: false })

// The base URL the hook below resolves relative links against. DOMPurify sanitizes nodes
// inside its own detached document, so the hook cannot read this off the page — it is
// module state, set for the duration of one synchronous render() call only.
let linkBase: string | null = null

// Links to another repository file resolve relative to the file they were written in, not
// to the catalog. Rewriting them against the source's GitHub location keeps them working;
// without this, every [COMPATIBILITY.md](COMPATIBILITY.md) in a README lands on a 404.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName !== 'A' || !(node instanceof Element)) return
  const href = node.getAttribute('href')
  if (!href) return

  // An in-page anchor stays in-page; anything already absolute only needs the rel guard.
  if (href.startsWith('#')) return
  if (/^(https?:|mailto:)/i.test(href)) {
    // target=_blank without noopener hands the opened page a window.opener handle.
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
    return
  }
  if (!linkBase) return
  try {
    node.setAttribute('href', new URL(href, linkBase).toString())
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  } catch {
    // An unresolvable link stays as written rather than becoming a broken absolute one.
  }
})

/**
 * Renders Markdown to sanitized HTML.
 * @param baseUrl GitHub URL of the directory the Markdown was read from, used to resolve
 *                relative links. Omit and relative links are left untouched.
 */
export function render(markdown: string, baseUrl?: string | null): string {
  const html = marked.parse(markdown, { async: false })
  linkBase = baseUrl ?? null
  try {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style', 'form', 'input', 'button'],
      FORBID_ATTR: ['style'],
    })
  } finally {
    // Cleared even on a throw: a stale base would silently rewrite the next page's links
    // against this page's source.
    linkBase = null
  }
}

/** The GitHub directory a source file lives in — the base for its relative links. */
export function baseFor(githubUrl: string | null | undefined): string | null {
  if (!githubUrl) return null
  return githubUrl.endsWith('.md') ? githubUrl.replace(/\/[^/]+$/, '/') : `${githubUrl.replace(/\/$/, '')}/`
}
