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

| Plugin | Owner | Description |
|---|---|---|
| [`sdd-engineering`](plugins/sdd-engineering/) | @stdroniv | Spec-driven development end to end: request → agreed spec → verified plan → implementation → review gate, with human approval at the two moments that matter. |
| [`research-tools`](plugins/research-tools/) | @stdroniv | Read-only research subagent for codebase and web lookups — short answers with `file:line` or URL citations, not prose. |
| [`architecture-review`](plugins/architecture-review/) | @stdroniv | Read-only architectural review: layering, dependency direction, coupling, module boundaries. |
| [`engineering-paved-path`](plugins/engineering-paved-path/) | @stdroniv | The single source for shared technical skills — TypeScript, React, Next.js, Fastify, Drizzle, PostgreSQL, Zod, Testing Library, Mermaid. |

`sdd-engineering` depends on the other three at `^1.0.0`; installing it pulls them in. It
needs Claude Code >= 2.1.196 for that resolution to happen — see
[its COMPATIBILITY.md](plugins/sdd-engineering/COMPATIBILITY.md). The other three run
anywhere.

Start with:

```
/plugin install sdd-engineering@dev-digest-harness
/sdd-engineering:ship-feature <your feature request>
```

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
