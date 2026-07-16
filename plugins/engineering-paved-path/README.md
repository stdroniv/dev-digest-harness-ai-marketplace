# engineering-paved-path

One source for the technical conventions our agents and engineers reach for. Nine skills,
each scoped to a library or layer.

Owner: Platform Engineering (see [CODEOWNERS](../../.github/CODEOWNERS)).

## Why this exists

The alternative is worse and it is what we had: every agent carrying its own copy of "how
we use Zod", each drifting from the others, none of them the source of truth. When an
agent embeds conventions, updating them means editing every agent that embedded them —
and nobody ever finds all of them.

So the conventions live here once, and agents *route* to them. `sdd-engineering`'s planner
and implementer name these skills in their routing tables rather than restating their
content. Fixing a convention is a version bump here, and every consumer gets it.

## What's in it

| Skill | Covers |
|---|---|
| `typescript-expert` | Type-level programming, performance, migrations, tooling |
| `react-best-practices` | Component design, hooks, state, anti-patterns |
| `react-testing-library` | RTL + Vitest: setup, query priority, async, mocking |
| `next-best-practices` | File conventions, RSC boundaries, data patterns, metadata |
| `fastify-best-practices` | Routes, plugins, JSON Schema validation, hooks, lifecycle |
| `drizzle-orm-patterns` | Schema, CRUD, relations, transactions, migrations |
| `postgresql-table-design` | Data types, indexing, constraints, performance |
| `zod` | Schema validation, parsing, error handling, inference |
| `mermaid-diagram` | Flowcharts, sequence, ER, state diagrams in markdown |

All nine are invoked by the model on demand — you do not type them. Their frontmatter
descriptions carry the trigger terms.

## Install

```
/plugin install engineering-paved-path@dev-digest-harness
```

## What is deliberately missing

Four skills that exist upstream did **not** ship in 0.1.0: `backend-onion-architecture`,
`ui-frontend-architecture`, `security`, and `client-server-communication`.

This is the sharpest trade-off in the release, and worth being honest about: those four
are the *opinionated* ones — the ones that say where a file goes and which dependency
direction is legal — and they are what the review agents actually cite. But each is
written against one repository's module layout (one literally opens "enforces … on
DevDigest's TypeScript backend (`server/` and `reviewer-core/`)"). Shipping them as-is
would hand every installer another team's folder structure as though it were a standard.

So this plugin currently ships the reference material without the judgement. Generalizing
those four is the top v2 item.

## Permissions

None. Skills are markdown — no hooks, no MCP servers, no `bin/`, no network.
