# research-tools

A read-only research subagent that looks something up and hands back a short, checkable
answer — either from the current codebase or from the web.

Owner: Platform Engineering (see [CODEOWNERS](../../.github/CODEOWNERS)).

## Why this exists

The default failure mode of asking a model to research something is fluent prose with no
way to tell which parts are real. This agent is constrained the other way: a fixed
template, an Evidence section that must cite `file:line` or a URL, an explicit Edge cases
line, and a stated confidence. If it cannot ground a claim, that shows up as a gap rather
than as confident text.

It is read-only by construction — `Read, Grep, Glob, WebSearch, WebFetch`. It cannot edit.

## Use it

Dispatch the `researcher` subagent with a question. Prefix to force the search type:

- `[code] Where is the retry policy for the queue consumer defined, and what backs it off?`
- `[web] What changed in the Fastify 5 error-handler contract vs 4?`

Without a prefix it picks based on the question.

## Install

```
/plugin install research-tools@dev-digest-harness
```

## Relationship to other plugins

`sdd-engineering` declares this as a dependency: its pipeline dispatches `researcher` for
targeted lookups before writing a spec. The agent is useful on its own, which is why it
ships separately rather than being absorbed into that plugin.

## Permissions

Declares `WebSearch` / `WebFetch` usage. That is the agent's whole mechanism — a `[web]`
lookup is a network call to the open internet. Nothing is sent anywhere on a `[code]`
lookup. No hooks, no MCP servers, no `bin/`.
