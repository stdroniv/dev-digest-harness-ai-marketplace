# architecture-review

A read-only architectural review of code: layering, dependency direction, coupling,
module boundaries, and where business logic belongs.

Owner: Platform Engineering (see [CODEOWNERS](../../.github/CODEOWNERS)).

## Why this exists

Most automated review tells you about a nit on line 40. This agent is scoped to the
question a nit-finder cannot answer: *is this change putting code in the wrong place?*
It reports a handful of real findings — each with a severity, the principle violated, and
a direction to move — rather than a long list.

It never proposes rewrites and never edits. Naming the problem and the principle is the
whole job; deciding what to do about it is yours.

## Use it

Dispatch the `architecture-review:architecture-reviewer` subagent — that full id is the
`subagent_type`; a bare `architecture-reviewer` is rejected. Triggers on "architecture
review", "review the design of…", "check the layering", "is this coupled correctly". Scope
can be one module, a PR's worth of changes, or the whole tree.

## Install

```
/plugin install architecture-review@dev-digest-harness
```

## How it learns your architecture

It has no built-in opinion about your folders. On each run it derives your module map and
intended dependency direction from what you already document — `CLAUDE.md`, architecture
docs, ADRs, lint boundary config, workspace layout.

Findings must cite a rule slug. It prefers **your** documented rules, quoted verbatim. If
you document none, it falls back to well-known named principles (`dependency-rule`,
`layering-violation`) and says that it did — and it will not invent a repo-specific-looking
slug to sound authoritative.

That has a consequence worth knowing: **this agent is only as sharp as your architecture
docs.** Against an undocumented repo it infers the map from the folder layout, says so,
and lowers the severity of borderline findings rather than asserting an invented design.
If you want better reviews, the highest-leverage thing you can do is write your rules
down.

## Relationship to other plugins

`sdd-engineering` declares this as a dependency and dispatches it in the review gate when a
change reshapes structure. It stands alone, which is why it ships separately.

## Permissions

Read-only: `Read, Grep, Glob`. No network, no hooks, no MCP servers, no `bin/`.
