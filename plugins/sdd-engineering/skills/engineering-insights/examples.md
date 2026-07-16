# Engineering Insights — good vs bad entries

The test: an agent reads the entry **cold** (no session context) and knows exactly
what to do. If it'd be obvious to anyone reading the code, don't write it.

## ✅ Good — specific, actionable, names the symbol

- **What Doesn't Work** — `Promise.all()` in the ingest pipeline times out past ~30
  items; use `Promise.allSettled()` in batches of 10 (`src/ingest/run.ts`).
- **Codebase Patterns** — DB-backed tests must use the `*.it.test.ts` suffix; the
  filename (not a config flag) decides whether the test container spins up.
- **Recurring Errors & Fixes** — "relation does not exist" on a fresh checkout →
  migrations aren't applied on boot; run the migrate command before the test suite.
- **Tool & Library Notes** — the `core` package is consumed as TS source and emits no
  `dist`; "fixing" the missing build output breaks its consumers. Leave it source-only.

## ❌ Bad — vague, obvious, or unactionable

- "Promises can be tricky." — noise, not a lesson.
- "Be careful with async." — says nothing actionable.
- "Added a new route." — obvious from the diff; not an insight.
- "Fixed the bug." — which bug, what fix, where?

## Shape of a strong entry

`- <what breaks / the rule> — <why> — <what to do instead>. (<file or symbol>)`

Lead with the failure or rule, not the backstory. One line; two or three at most for
genuinely complex cases.
