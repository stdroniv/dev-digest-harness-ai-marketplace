# Plugin guidelines

The rules a plugin must follow to be accepted. [CONTRIBUTING.md](../CONTRIBUTING.md)
covers the *path* from proposal to merge; this file is the *rules*, and it is the
canonical reference for both engineers and coding agents.

Everything here is enforced by `scripts/lint-marketplace.mjs` unless marked
**[review]**, which means a human checks it.

## Naming

| Thing | Rule | Example |
|---|---|---|
| Plugin directory | kebab-case; **must** equal `plugin.json` `name` | `architecture-review` |
| Plugin `name` | kebab-case; **immutable** | `architecture-review` |
| Skill directory | kebab-case; **must** equal SKILL.md frontmatter `name` | `review-adr` |
| Agent file | kebab-case `.md` | `agents/adr-reviewer.md` |
| Git tag | `<plugin-name>--v<version>` | `architecture-review--v1.2.0` |

**Plugin names are immutable.** The `name` is the skill namespace (`/<plugin>:<skill>`)
and the install identity. Renaming breaks every existing install and requires a `renames`
entry in `marketplace.json` to migrate users. Pick the name you can live with.

To change only the label shown in `/plugin`, set `displayName` — it is free to change.

**[review]** Name for the problem, not the team or the tool: `architecture-review`, not
`platform-adr-helper`. Team names change; problems don't.

## Required structure

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json        # manifest — NOTHING else in this directory
├── skills/<skill>/SKILL.md
├── agents/*.md            # optional
├── CHANGELOG.md           # required
└── README.md              # what it does, who owns it
```

**Only `plugin.json` goes inside `.claude-plugin/`.** `skills/`, `agents/`, `commands/`,
and `hooks/` live at the **plugin root**. Putting them under `.claude-plugin/` is the most
common mistake in the ecosystem, and it fails silently — Claude Code simply never loads
them, with no error.

Every plugin must ship at least one of `skills/`, `agents/`, or `commands/` — or be a
[bundle](#bundle-plugins).

Copy `tests/fixtures/valid-plugin/` to start. CI validates it on every run, so it cannot
go stale.

## Manifest fields

`.claude-plugin/plugin.json`:

```jsonc
{
  "name": "architecture-review",      // required, immutable, == directory name
  "displayName": "Architecture Review", // optional, free to change
  "description": "…",                 // required — shown in /plugin
  "version": "1.2.0",                 // required, semver, MUST be bumped on every change
  "author": { "name": "…", "email": "…" },
  "license": "UNLICENSED",
  "keywords": ["architecture", "adr"],
  "dependencies": []                  // see below
}
```

**Never set `version` in the marketplace entry.** `plugin.json` silently wins over it, so
a value there is invisible and misleading. The linter rejects it.

**Do not list component paths.** `skills/`, `agents/`, and `commands/` load from the plugin
root by convention. The manifest *does* accept a `skills` array, but it only restates the
default — and its `agents` counterpart takes **file** paths, not a directory: `"agents":
["./agents"]` fails validation with `agents: Invalid input`, and the form that does
validate (`["./agents/spec-creator.md", …]`) has to be re-edited every time an agent is
added. Ship the directories; say nothing in the manifest.

**There is no `compatibility` field**, and no other supported way to declare a minimum
Claude Code version. `claude plugin validate --strict` accepts the key but reports it
unknown and "safe to keep" — i.e. ignored at load time, which is the opposite of a floor.
A plugin that needs a minimum version documents it in a `COMPATIBILITY.md` and says what
breaks below it; see [`plugins/sdd-engineering/COMPATIBILITY.md`](../plugins/sdd-engineering/COMPATIBILITY.md).
Unknown fields are ignored rather than rejected, so anything you invent here fails silently
while looking configured.

The marketplace entry stays minimal — the registry holds pointers, the plugin holds truth:

```jsonc
{ "name": "architecture-review", "source": "./plugins/architecture-review", "description": "…", "category": "…" }
```

`source` is a **repo-root-relative path** and must start with `./`. A bare name is rejected
by the schema (`plugins.N.source: Invalid input`), so a marketplace using one fails
`claude plugin validate . --strict` and can never be added.

**Nothing prepends a plugin root.** `metadata.pluginRoot` is inert — it does not affect
resolution. Verified against Claude Code 2.1.211: with `pluginRoot` set to `./plugins` and
`source` set to `./demo`, install fails with `Source path does not exist: <repo>/demo`. Do
not set it; write the full path in `source`. The linter rejects it.

## Skills

The frontmatter `description` is the **only** thing Claude reads when deciding whether to
invoke a skill. Write it as *when to use this*, not *what this is*:

```yaml
---
name: review-adr
description: Review an architecture decision record against our standards. Use when someone asks to review an ADR, check a design doc, or validate an architecture decision.
---
```

A vague description fails silently and identically to a missing skill: nothing happens and
nobody finds out why. The linter rejects descriptions under 20 characters, but that is a
floor, not a target.

Add `disable-model-invocation: true` for skills that should only run when a user types them.

`$ARGUMENTS` interpolates whatever follows the skill name.

## Dependencies

Declare plugin dependencies in `plugin.json`. An entry is a bare name, or an object with a
semver range:

```jsonc
"dependencies": [
  "audit-logger",
  { "name": "secrets-vault", "version": "~2.1.0" }
]
```

Rules:

- **Dependencies resolve inside this marketplace** unless you set `marketplace`.
- **Cross-marketplace dependencies are blocked at install** unless the target is listed in
  `allowCrossMarketplaceDependenciesOn` in `marketplace.json`. That is a platform
  engineering decision — it means trusting another catalog's review process.
- **A version constraint only works against tagged releases.** Constraints resolve against
  git tags named `<plugin>--v<version>`, *not* `plugin.json`. Constraining an untagged
  plugin disables the dependent with `no-matching-tag`. See [RELEASES.md](RELEASES.md).
- **Prefer a constraint over a bare name** when you depend on behavior. Without one, an
  upstream release changes under you and can break your plugin with no warning.
- Constrain no tighter than you must. `~2.1.0` and `~3.0` on the same dependency is a
  `range-conflict` that blocks install for whoever has both.

### Bundle plugins

A manifest that is *only* a `dependencies` array is a valid plugin: installing it pulls in
the whole set. Use it to package a curated set behind one install.

```jsonc
{
  "name": "engineering-paved-path",
  "version": "1.0.0",
  "description": "Standard plugin set for engineers",
  "dependencies": ["research-tools", "architecture-review", "sdd-engineering"]
}
```

Admins can then roll the set out fleet-wide via `enabledPlugins` in managed settings.

## Absolute paths are forbidden

Machine-specific paths work for the author and break for everyone else. Use
`${CLAUDE_PLUGIN_ROOT}` — it resolves to the plugin's own directory on any machine:

```jsonc
// .mcp.json
{
  "mcpServers": {
    "db": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    }
  }
}
```

The linter scans `.mcp.json`, `.lsp.json`, `settings.json`, `hooks/hooks.json`, and
`monitors/monitors.json` for `/Users/…`, `/home/…`, `C:\…` and similar. Prose is not
scanned — docs may legitimately mention real paths.

## Secrets are forbidden

Never commit a secret, and never ask users to hand-edit `settings.json`. Declare it as
`userConfig` with `"sensitive": true` and Claude Code prompts the user and stores it:

```jsonc
"userConfig": {
  "api_token": { "type": "string", "title": "API token", "sensitive": true }
}
```

See [SECURITY.md](../SECURITY.md).

## Before you request review

Required:

1. `node scripts/lint-marketplace.mjs` — structure, registry, dependencies, version bump
2. `claude plugin validate ./plugins/<name> --strict` — manifest schema
3. **Install test**: `claude --plugin-dir ./plugins/<name>` in a real project, then invoke
   each skill. A plugin that lints clean and does nothing useful still fails review.
4. **Update test** for a change to an existing plugin: install the *previous* version,
   then update to yours and confirm nothing breaks. Bumps are one-way for users.

**[review] Evals.** For any skill whose output quality matters — a review, a summary, a
generated artifact — run it against a handful of real cases and paste the results in the
PR. There is no automated eval gate; the reviewer is checking that you tried it on
something real, not just that it parses. Skills fail by producing plausible garbage, and
that is invisible to every check above.

## Pull request checklist

The [PR template](../.github/pull_request_template.md) covers this, but in short — say:

- **What changed.**
- **Why it isn't breaking**, or if it is, what users must do. A MAJOR bump needs an
  explicit migration note in the CHANGELOG.
- **What permissions and dependencies it adds.** Any new `hooks/hooks.json`, `.mcp.json`,
  `bin/`, or `settings.json` requires platform engineering **and** security review — those
  run unsandboxed on every installer's machine.
