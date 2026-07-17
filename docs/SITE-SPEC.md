# Site spec

The catalog at [`site/`](../site) — what it shows, where its data comes from, and how it
ships.

## Why it exists

The CLI is still how a plugin gets installed. Nothing on this site installs anything; the
last thing it does for you is put a command on your clipboard.

The site exists for the step *before* that, which the CLI does not serve: finding out that
a plugin or a skill exists at all, reading what it does, seeing what it drags in with it,
and getting the install command right. `/plugin` lists what you already have. This answers
what there is.

## The rule that shapes everything

**Repository files are the only source of data.** Every number, name, version, dependency
and command on the site is read out of `.claude-plugin/marketplace.json`, the plugins, and
their Markdown, by [`scripts/build-index.mjs`](../scripts/build-index.mjs). No page has a
hand-written count, a hard-coded plugin list, or a typed-out install command.

The catalog is never edited by hand. Change a plugin, and the catalog follows on the next
deploy. Two things follow from that, and both are load-bearing:

- **The install command is derived, not typed.** `@dev-digest-harness` comes from
  `marketplace.json`'s `name`, and the repo slug in `/plugin marketplace add …` comes from
  `GITHUB_REPOSITORY`. A catalog that hands out a command that doesn't work is worse than
  no catalog, and a copied-and-edited string is exactly how that happens. Rename the
  marketplace and every command on the site changes with it.
- **Generated files are not committed.** `site/public/` and `site/dist/` are git-ignored.
  A committed index is a second source of truth, and it goes stale silently — you'd see a
  plugin at its old version with no error anywhere.

## Not in this version

No backend, no auth, no ratings, no download counters, no GitHub API at runtime. The site
is static files. Search runs in the browser.

That is a real constraint, not just a smaller scope: usage counts and ratings need a
server to write to and a story about who may write to it. Everything below works as
static files on GitHub Pages.

## Data

`scripts/build-index.mjs` reads:

| Source | What comes out of it |
|---|---|
| `.claude-plugin/marketplace.json` | Marketplace name, description, owner, plugin list, category |
| `plugins/<name>/.claude-plugin/plugin.json` | Display name, description, version, license, author, keywords, dependencies |
| `plugins/<name>/README.md` | The plugin page body |
| `plugins/<name>/CHANGELOG.md` | Releases — the What's new feed |
| `plugins/<name>/COMPATIBILITY.md` | The compatibility section, when the plugin has one |
| `skills/<name>/SKILL.md` | Frontmatter (name, description, allowed-tools, metadata.tags) + body |
| `agents/<name>.md` | Frontmatter (name, description, tools, model) + body |
| `commands/<name>.md` | Frontmatter + body |
| `hooks/hooks.json` | One component per event, with the commands it runs |
| `.mcp.json` | One component per server: transport, target, env slot *names* |
| `git log` | Last-modified date per component |

MCP env values are never read — only the names of the slots. A catalog must not become a
place where a credential leaks, however a plugin's config is written.

### Output

```
site/public/
├── index.json      marketplace metadata + every searchable component
├── releases.json   CHANGELOG entries, newest first
├── stats.json      the home page counters
└── bodies/<plugin>/<type>/<name>.md
```

`index.json` is fetched in full on first load, so it carries only what search and result
cards need: each component's fields plus `searchText`, a flattened prefix of its body
(4,000 chars). Full bodies live in `bodies/` and are fetched per page. `bodies/` is
rebuilt from scratch on every run — a component deleted from a plugin must not leave a
page behind.

A component id is `<plugin>/<type>/<name>`, which is also its route and its body path. It
needs no escaping and stays readable in the URL bar.

Run it:

```bash
npm run build:index      # write site/public/
npm run check:index      # summarize, write nothing
```

It warns rather than fails on a plugin with no README or an unparseable file, and fails
only if it indexed no plugins at all — publishing an empty catalog is the one outcome
worth breaking the build for. The structural rules are the linter's job, not its.

## Screens

Hash routing (`#/…`), because Pages serves static files with no rewrite rule: a real path
would 404 on reload and on every shared deep link. The hash never reaches the server.

| Route | Screen |
|---|---|
| `#/` | Home |
| `#/search?q=&type=` | Search results |
| `#/plugin/<name>` | Plugin detail |
| `#/artifact/<plugin>/<type>/<name>` | Skill / agent / command / hook / MCP detail |
| `#/whats-new` | Every release |
| `#/getting-started` | Add the marketplace, install, update |

**Home** — the global search box, keyword chips ranked by how many components carry each
one, the counters for every component type (each links to that type's filtered view), and
the latest releases. Every number comes from `stats.json`; the chips come from the index.

**Search** — MiniSearch over name, display name, description, keywords, invocation and
body text, with prefix matching, length-scaled fuzziness, match highlighting, and a type
filter. With no query it lists the catalog, so a type filter alone ("show me every agent")
is a way to browse. The query lives in the URL, so a search is shareable.

**Plugin detail** — version, compatibility, owner, updated date, category, license; the
install command with Copy install; View on GitHub; what it ships, linked; dependencies and
what depends on it; and the README, rendered.

**Artifact detail** — the deep-link page for one skill or agent: name, type, description,
invocation, tools, model, owning plugin, the rendered `SKILL.md` or agent instruction, and
the command that installs its parent plugin. Tools are listed because they are the
permissions the thing runs with, and plugins run unsandboxed.

**Command palette** — Cmd/Ctrl+K anywhere, to jump to any plugin, skill or agent.

Both themes are supported and the choice persists; it follows the OS until the reader
overrides it. UI copy lives in [`site/src/i18n/en.ts`](../site/src/i18n/en.ts) — components
hold no literal strings.

### Rendering repository Markdown

READMEs and skill bodies are written by plugin authors and coding agents, and Markdown
permits raw HTML. Every body is rendered with `marked` and **sanitized with DOMPurify**
before it reaches the DOM ([`site/src/lib/markdown.ts`](../site/src/lib/markdown.ts)).
Parsing is not a safety boundary; sanitizing is. `dangerouslySetInnerHTML` appears only in
components that take their HTML from that one function.

Relative links are rewritten against the source file's location on GitHub — otherwise
every `[COMPATIBILITY.md](COMPATIBILITY.md)` in a README lands on a 404.

## Running it locally

Two ways, and they answer different questions.

**Working on the site** — hot reload, on <http://localhost:5173>:

```bash
cd site && npm install && npm run dev
```

`predev` runs `build:index` first, so this works in a fresh clone: without generated data
the app has nothing to fetch and renders an error, and that is a confusing way to meet a
catalog. Editing anything under `site/src/` hot-reloads.

**Checking what will actually be published** — the real production bundle:

```bash
npm run build:index
cd site && npm ci && npm run build && npm run preview
```

Use this before trusting a change: `dev` runs unminified through a different pipeline, and
`build` also runs the typecheck.

### Editing a plugin while the site is up

Nothing under `plugins/` is hot-reloaded. The site reads generated JSON, not the plugins,
so a plugin edit needs the index rebuilt and the page refreshed:

```bash
npm run build:index    # then refresh the browser
```

The dev server does not do this for you, and it will not tell you it hasn't: the page keeps
serving the previous catalog quite happily. If an edit "didn't take", this is why.

### Base paths

`preview` derives its base from the same `GITHUB_REPOSITORY` as the build, so it must be
set the same way for both or `preview` serves `/` while the bundle asks for `/<repo>/` and
every asset 404s. Locally, leave it unset for both and everything is `/`. To reproduce the
published layout exactly:

```bash
export GITHUB_REPOSITORY=stdroniv/dev-digest-harness-ai-marketplace
cd site && npm run build && npm run preview   # http://localhost:4173/dev-digest-harness-ai-marketplace/
```

The Vite `base` is derived from `GITHUB_REPOSITORY`: a Pages project site is served from
`/<repo>/`, not `/`. Outside Actions it stays `/`, so dev and preview work unchanged, and
a fork or a rename publishes working asset URLs with no edit. Everything fetched at
runtime goes through `import.meta.env.BASE_URL`.

## Deploying

| Workflow | Trigger | What it does |
|---|---|---|
| [`site-build.yml`](../.github/workflows/site-build.yml) | Pull request | Builds the index and the frontend. Catches a plugin change that breaks the catalog before it merges. |
| [`pages.yml`](../.github/workflows/pages.yml) | Push to `main` | The same steps, then publishes `site/dist` to Pages. |

Pages needs **Settings → Pages → Source → GitHub Actions**, once.

Both check out with `fetch-depth: 0`: last-modified dates come from `git log`, and a
shallow clone would silently date everything to the checkout.

## Verifying a change

After a plugin change reaches `main`:

- [ ] the plugin is in the catalog
- [ ] search finds it, and finds its skills
- [ ] the counters moved
- [ ] its release is in What's new
- [ ] its detail page shows the right version and dependencies
- [ ] **Copy install** copies `/plugin install <name>@dev-digest-harness`
