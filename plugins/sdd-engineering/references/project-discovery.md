# Project discovery

How every agent in this plugin learns the repository it has been dropped into.

## The rule

**Never assume a module layout, a stack, a command, or a path. Discover them, once, at the
start of your run.**

These agents were extracted from a codebase where they knew everything: which folder held
the API, which port it listened on, what the test-file suffix meant, where the composition
root lived. That knowledge made them sharp there and useless anywhere else — an agent that
hardcodes `server/` confidently writes a plan for a repository that has no `server/`.

So the knowledge moved out of the agent and into a discovery step. The agent is now the
procedure; the repository supplies the facts.

## Where to look, in order

1. **`CLAUDE.md` at the repository root.** The primary source. If it exists, it is the
   maintainers' own description of layout, stack, commands, and conventions — written for
   exactly this purpose. Read it first and prefer it over anything you infer.
2. **Module-level `CLAUDE.md`.** Many repos put one per package or per module. If the root
   file routes you to one ("when changing the API, read `api/CLAUDE.md`"), follow it for
   the modules you are touching. Do not read all of them speculatively.
3. **`README.md`.** Fills gaps the `CLAUDE.md` leaves — usually setup and commands.
4. **The package layout itself.** `package.json` (workspaces, scripts, name), `go.mod`,
   `pyproject.toml`, `Cargo.toml`, the directory tree. This is ground truth for what
   exists, and the fallback when the repo documents nothing.
5. **`INSIGHTS.md` or equivalent**, if present — accumulated gotchas. Read the ones for
   the modules you are touching.

## What you need before you act

Whatever your step requires, and no more:

| You need | Get it from |
|---|---|
| Which modules exist and what each is for | root `CLAUDE.md`, else the package layout |
| The stack (framework, ORM, test runner) | `CLAUDE.md`, else dependencies in the manifest |
| How to typecheck / lint / test / build | `CLAUDE.md`, else `package.json` scripts, else the README |
| Where specs and plans live | `CLAUDE.md`; if unstated, ask, then default to `specs/` and `docs/plans/` |
| Test conventions (naming, unit vs integration split) | `CLAUDE.md`, else read two existing test files |
| What must not be touched | `CLAUDE.md` "do not touch"-style sections; respect them literally |

## When discovery comes up empty

Say so. Do not invent.

- **A convention you cannot find is a question, not a default.** If the repo does not say
  where plans live, ask the user rather than picking a folder and building on it. One
  wrong assumption at step 1 propagates through every downstream step.
- **A command you cannot find is a blocker.** If you cannot determine how to run the
  tests, report that instead of guessing `npm test` and reporting a failure that means
  nothing.
- **Exception — a genuinely conventional default.** Where an ecosystem has one obvious
  answer (`package.json` `scripts.test` for Node), take it and say you did.

## What this looks like in practice

Wrong — the extracted agent, still carrying its birthplace:

> The backend lives in `server/` (Fastify 5 + Drizzle, port 3001). Run
> `cd server && pnpm typecheck`. Integration tests use the `*.it.test.ts` suffix.

Right — the same agent, portable:

> Read the root `CLAUDE.md` to establish the module map, the stack, and the verification
> commands. If it names a test-file convention, follow it exactly; if it does not, infer it
> from two existing test files before writing a third. Verify with the commands the
> repository documents — not with commands you assume exist.

## A note on cost

Discovery is not free, and re-discovering the same facts in every subagent is the main way
this pipeline wastes tokens. The orchestrator (`ship-feature`) discovers once and passes
the result down in each agent's prompt. If you are a subagent and your prompt already
contains the module map, use it — do not re-read `CLAUDE.md` to confirm.
