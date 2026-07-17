import { useEffect, useState } from 'react'
import { useCatalog, type Catalog } from './lib/data'
import { href, useRoute, type Route } from './lib/router'
import { useTheme } from './lib/theme'
import { isMac } from './lib/platform'
import { t } from './i18n/en'
import { CommandPalette } from './components/CommandPalette'
import { Home } from './pages/Home'
import { Search } from './pages/Search'
import { Plugin } from './pages/Plugin'
import { Artifact } from './pages/Artifact'
import { WhatsNew } from './pages/WhatsNew'
import { GettingStarted } from './pages/GettingStarted'
import { NotFound } from './pages/NotFound'

export function App() {
  const state = useCatalog()
  const route = useRoute()
  const [theme, toggleTheme] = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Accept both modifiers: the platform guess only picks the label, never gates it.
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  // Close on navigation: opening a result while the palette stays up is disorienting.
  useEffect(() => setPaletteOpen(false), [route])

  return (
    <>
      <a className="skip" href="#main">
        {t.common.skipToContent}
      </a>

      <header className="topbar">
        <nav className="topbar-inner">
          <a className="brand" href={href.home()}>
            {t.nav.home}
          </a>
          <div className="topbar-links">
            <a href={href.search()}>{t.nav.search}</a>
            <a href={href.whatsNew()}>{t.nav.whatsNew}</a>
            <a href={href.gettingStarted()}>{t.nav.gettingStarted}</a>
            <button
              type="button"
              className="icon-button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t.nav.openPalette}
              title={isMac() ? '⌘K' : 'Ctrl+K'}
            >
              ⌘K
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              aria-label={t.nav.themeToggle}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </nav>
      </header>

      <main id="main" className="main">
        {state.status === 'loading' && <p className="muted center">{t.common.loading}</p>}
        {state.status === 'error' && (
          <div className="empty">
            <h1>{t.common.error}</h1>
            <p className="muted">{t.common.errorHint}</p>
            <p className="mono small muted">{state.error.message}</p>
            <button type="button" className="button" onClick={() => location.reload()}>
              {t.common.retry}
            </button>
          </div>
        )}
        {state.status === 'ready' && <Page route={route} catalog={state.data} />}
      </main>

      {state.status === 'ready' && (
        <CommandPalette catalog={state.data} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      )}
    </>
  )
}

function Page({ route, catalog }: { route: Route; catalog: Catalog }) {
  switch (route.name) {
    case 'home':
      return <Home catalog={catalog} />
    case 'search':
      return <Search catalog={catalog} query={route.query} type={route.type} />
    case 'plugin':
      return <Plugin catalog={catalog} name={route.plugin} />
    case 'artifact':
      return <Artifact catalog={catalog} id={route.id} />
    case 'whats-new':
      return <WhatsNew catalog={catalog} />
    case 'getting-started':
      return <GettingStarted catalog={catalog} />
    default:
      return <NotFound />
  }
}
