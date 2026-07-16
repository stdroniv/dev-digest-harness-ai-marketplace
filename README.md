# dev-digest-harness

Our internal [Claude Code](https://code.claude.com/docs) plugin marketplace: a private
catalog of shared agent workflows — skills, agents, hooks, and MCP servers — that any
engineer can install.

## Install

```
/plugin marketplace add <org>/dev-digest-harness-ai-marketplace
/plugin install <plugin-name>@dev-digest-harness
```

Admins can auto-inject the marketplace so nobody has to run the first command — see
[docs/admin-rollout.md](docs/admin-rollout.md).

## Available plugins

*None yet.* This repo currently holds the registry, CI, and conventions so that the first
plugin lands on solid ground. Yours could be the first — see
[CONTRIBUTING.md](CONTRIBUTING.md).

<!-- Add a row per plugin as they land:
| Plugin | Owner | Description |
|---|---|---|
| `example` | @<org>/team | What it does |
-->

## Layout

```
.claude-plugin/marketplace.json   # the registry: pointers only
plugins/<name>/                   # one directory per plugin, full metadata in its plugin.json
tests/fixtures/valid-plugin/      # canonical reference layout — copy this to start
scripts/lint-marketplace.mjs      # structural linter (required CI check)
docs/                             # guidelines, releases, security, admin rollout
```

The registry holds only pointers; each plugin owns its metadata and version. That keeps
plugins independently versioned and independently owned — a change to one plugin never
releases another, and this marketplace releases independently of any product.

If a plugin later needs a separate owner or release cadence, its source can move to its own
repository and the entry becomes `{"source": "github", "repo": "…"}`. Users don't notice.

## Docs

| Doc | What's in it |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | The path from proposal to merged PR |
| [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md) | Naming, required structure, manifest fields, dependencies |
| [docs/RELEASES.md](docs/RELEASES.md) | SemVer, tags, update, rollback |
| [SECURITY.md](SECURITY.md) | Permissions, secrets, what to do about a dangerous release |
| [docs/admin-rollout.md](docs/admin-rollout.md) | Fleet rollout and policy |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). The short version:

- The marketplace is for **common, shared problems**. Team-specific workflows belong in
  your team's own repo. Check scope with platform engineering first.
- Copy `tests/fixtures/valid-plugin/` — it is CI-verified, so it never goes stale.
- **Bump `version` on every change.** Claude Code caches by version string; merging
  without a bump ships nothing to anyone, silently. The same cache means rollback is
  roll-*forward*, never a revert.
- Your team owns your plugin via CODEOWNERS. Adding one needs platform engineering review;
  updating one does not.

Plugins run **unsandboxed with full trust** on every installer's machine. Read
[SECURITY.md](SECURITY.md) before adding hooks, MCP servers, or `bin/` entries.

## Checks

```bash
node scripts/lint-marketplace.mjs                       # structure, registry, version bumps
claude plugin validate ./plugins/<name> --strict        # manifest schema
claude --plugin-dir ./plugins/<name>                    # load locally without installing
```
