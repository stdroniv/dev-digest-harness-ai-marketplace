# Eval cases

Procedure and scoring: [README.md](README.md). Each case names the component it is really
testing; run the whole pipeline anyway, since most of these can only fail in context.

---

## E1 — Discovery does not guess where artifacts go

**Component:** `ship-feature` step 0.5 / `references/project-discovery.md`
**Repo shape:** No root `CLAUDE.md`, no `specs/`, no `docs/plans/`.

**Input:** `/sdd-engineering:ship-feature add a health check endpoint`

**Passes when:**
- It states that it is inferring the layout, and from what.
- Before writing the spec, it either asks where specs live or names `specs/` explicitly as
  a default it chose — not as a fact about this repo.

**Fails when:**
- A spec appears at `specs/SPEC-01-*.md` with no mention that the path was a default.
- It describes the module layout in the confident register of a repo that documented it.

> The whole extraction rested on the agents no longer knowing a repo they were never told
> about. This is the case that catches that regression.

---

## E2 — A missing test command blocks, it does not get invented

**Component:** `implementer`, `ship-feature` verification step
**Repo shape:** No `CLAUDE.md`; a manifest with **no** test script (e.g. `package.json`
with `scripts` lacking `test`).

**Input:** any small feature request, carried past the plan gate.

**Passes when:**
- It reports that it cannot determine how to run the tests, and says so as a blocker.
- The final report does **not** say "merge-ready", and states unmissably that nothing was
  verified.

**Fails when:**
- It runs `npm test`, gets "Missing script: test", and reports a test failure. A failure
  that means nothing is worse than no answer: it reads like a real signal.
- The report claims merge-readiness with a quiet caveat further down.

---

## E3 — The plan gate catches a missed acceptance criterion

**Component:** `spec-conformance`
**Repo shape:** any.

**Input:** a request with an easily-dropped second requirement, e.g.
`add an endpoint that returns the current user, and rate-limit it to 10 requests per minute`.
At the plan gate, if the plan happens to cover both, delete the rate-limit task from the
plan file by hand and re-run the conformance check against it.

**Passes when:**
- The rate-limit AC is reported as uncovered, naming the AC id.
- The gate blocks. No code is written.

**Fails when:**
- The plan is passed as covering the spec. This is the cheapest gate in the pipeline; a
  miss here is paid for at review, which is the exact trade the plugin claims to fix.

---

## E4 — The reverse check finds unrequested scope

**Component:** `plan-verifier`
**Repo shape:** any.

**Input:** run a small feature to completion; before verification, hand-add a plausible
extra to the diff that no AC asked for (a caching layer, an extra endpoint).

**Passes when:**
- The extra is flagged as built-but-not-requested.
- Requirements are each classified Implemented / Partial / Missing / Cannot-verify with
  `file:line` evidence.

**Fails when:**
- Coverage is reported as complete and the extra goes unmentioned. "Did we build more than
  we agreed to" is half of what this agent is for.

---

## E5 — An absent optional agent is skipped loudly

**Component:** `ship-feature` optional-agent handling
**Repo shape:** any. Do **not** install `test-writer`, `security-reviewer`, `doc-writer`
(they are not part of this release, so this is the default state).

**Input:** any feature request run end to end.

**Passes when:**
- It announces each skip during the run and records it in the final report.
- It never reports plain "merge-ready" for a run that authored no tests.

**Fails when:**
- A step is skipped silently, or the report's summary line implies review coverage the run
  did not have.

---

## E6 — The bundled script resolves from the plugin cache

**Component:** `workflow-retro`
**Repo shape:** any repo with a finished multi-agent run in the session.

**Input:** `/sdd-engineering:workflow-retro deep`

**Passes when:**
- The script is invoked via `${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py` and runs.
- The project slug is derived at run time from the CWD.
- The report cross-checks totals against `/cost` rather than presenting the script's raw
  token sums as billed figures.

**Fails when:**
- The script is not found — the path was spelled relative to the project rather than the
  skill's own directory.
- Deep mode silently finds no journals and the retro proceeds as if that were normal.

---

## E7 — The spec is clarified first, and holds no HOW

**Component:** `spec-creator`
**Repo shape:** any.

**Input:** a request with a deliberate design gap — e.g.
`/sdd-engineering:ship-feature let users export their reports` — silent on format,
scale, and who may export.

**Passes when:**
- It returns a **Clarification response** and *waits*, rather than writing a spec on
  first contact. The blocking questions name the actual gaps (format? permissions?
  size limits?), not generic filler.
- After the answers, the spec's acceptance criteria are EARS-form and observable, each
  carrying a stable `AC-N` id.
- The spec names **no** file path, framework, table, function, route shape, or library.

**Fails when:**
- A spec appears with no clarification round on a request that plainly underdetermines
  the outcome.
- Any AC reads as an instruction to a programmer — "add `exportReport()` to the reports
  service", "store the job in a `exports` table". Apply `spec-creator`'s own test: if a
  sentence names a file, framework, function, table, or wiring, it is HOW and this case
  fails.

> The spec/plan split is the pipeline's load-bearing contract. A spec that leaks HOW
> pre-commits the plan to a design nobody reviewed, and the plan gate then rubber-stamps
> a decision that was never actually made.

---

## E8 — The planner plans against the spec, it does not re-derive it

**Component:** `implementation-planner`
**Repo shape:** any.
**Setup:** carry E7's approved spec (or any spec with ≥3 ACs) to the plan stage.

**Passes when:**
- Every plan task cites the `AC-N` id it serves; the ACs are restated, not reinvented.
- Its clarification round asks **HOW-level questions only** — execution mode, technical
  gaps — plus the execution-mode choice it must surface for the user to decide.
- A question the spec already answers is resolved *from the spec*, not bounced back to
  the user.

**Fails when:**
- It re-opens settled WHAT: re-asking scope, re-negotiating an AC, or adding a
  requirement the spec never stated.
- The user is asked the same question the spec gate already answered. Two clarify gates
  asking one question twice is the specific failure the Step-2/Step-3 split exists to
  prevent, and it reads as thoroughness while being pure waste.

---

## E9 — Code dispatch is typed to `implementer`

**Component:** `ship-feature` Step 5 (the plan → implementer hand-off)
**Repo shape:** any. Run on an **Opus** main session — the mistake is invisible on Sonnet.

**Input:** a feature large enough to reach a multi-agent plan, carried past the plan gate.

**Passes when:**
- **Every** code-writing dispatch passes `subagent_type: sdd-engineering:implementer`.
  Check `/cost` after the fan-out: the code waves appear under `implementer` (Sonnet).
- Fan-out follows the plan's dependency order, one agent per non-overlapping
  `Owned paths` group.
- Each downstream agent's prompt carries the **real** upstream signature / route
  contract, not an instruction to go find it.

**Fails when:**
- `/cost` shows a `general-purpose` subagent line. That is a code wave that omitted
  `subagent_type` and silently ran at the orchestrator's tier — Opus-priced mechanical
  component builds, and the single largest avoidable cost of a real run.
- A dispatch errors with `Agent type 'implementer' not found` — the id was spelled bare.
  See E13; that failure is loud, and this case is really about the quiet one.
- Agents with overlapping owned paths launch concurrently, or a downstream agent guesses
  an upstream interface.

> The mis-tier is scored from `/cost`, not the transcript. The run *succeeds* either way —
> that is exactly why it needs a case: the failure shows up only on the bill.

---

## E10 — The review gate reaches the dependency plugin's reviewer

**Component:** `ship-feature` Step 7 · `architecture-review` (dependency plugin)
**Repo shape:** any. The diff must change **structure** — a new module, a moved
boundary, cross-layer wiring — or Step 7 is correct to skip the reviewer.

**Input:** a structural feature run end to end, with `architecture-review` installed as a
resolved dependency.

**Passes when:**
- It is dispatched as `subagent_type: architecture-review:architecture-reviewer` — the
  prefix is the **dependency plugin's**, not `sdd-engineering:` — and returns findings
  with a severity, the principle violated, and a direction to move.
- It is spawned **in parallel** with the other reviewers — one message, multiple `Task`
  calls.
- Its prompt carries the changed-file list: it has **no Bash** and cannot compute the diff
  itself.
- `/plugin` shows `architecture-review` enabled alongside `sdd-engineering`.

**Fails when:**
- The reviewer is missing and the run doesn't say so. Per
  [COMPATIBILITY.md](../COMPATIBILITY.md), a build without dependency support ignores the
  `dependencies` block entirely and the plugin still installs — so this case is also the
  check that dependency resolution actually ran.
- The reviewer is dispatched with no changed-file list and reviews the wrong scope, or
  silently reviews nothing.
- The main session performs the architectural review itself.

---

## E11 — Verification is against the ACs, with evidence

**Component:** `plan-verifier`
**Repo shape:** any.
**Setup:** run a feature with ≥3 ACs to completion. Before verification, **remove one
AC's implementation** from the diff by hand.

**Input:** the Step 7 review fan-out.

**Passes when:**
- The gutted AC is reported **Missing**, named by its `AC-N` id, and the verdict blocks.
- Every other requirement is classified Implemented / Partial / Missing / Cannot-verify
  with `file:line` evidence — not an assertion that it was done.
- It names any untested critical path (the standing coverage backstop).

**Fails when:**
- The removed AC is reported Implemented. An AC marked covered with no evidence behind it
  is the pipeline's worst output: it converts an unverified claim into a merge-ready one.
- Coverage is asserted in prose with no `file:line` to check.

> E4 is this case's mirror — it tests the reverse direction (built-but-not-requested).
> Run both; they fail independently.

---

## E12 — The retro never fires on its own

**Component:** `workflow-retro`
**Repo shape:** any repo with a finished multi-agent run in the session.

**Input:** finish a `ship-feature` run and say nothing further. Then, separately, ask
`how did that run go?`

**Passes when:**
- The pipeline ends at its Step 10 report. No retro runs, and no ledger row is appended.
- Step 10 may *mention* that `/sdd-engineering:workflow-retro` exists — mentioning is not
  running.
- The retro runs on the explicit ask, and only then.

**Fails when:**
- A retro appears unbidden at the end of the run, or a ledger row is written that nobody
  asked for.
- Anything wires it to a `Stop` / `SubagentStop` / `PreToolUse` hook or chains it to the
  end of another skill.

> The skill states it must never be automatic, and that auto-triggering is a bug to stop
> and report. This is the case that holds that line — a retro forced after every run is
> the ceremony that breeds retro fatigue, and the value is in running it deliberately.

---

## E13 — Skills and agents resolve by their namespaced id

**Component:** `ship-feature` · `implementation-planner` · `implementer` — skill routing
and agent dispatch
**Repo shape:** a TypeScript repo touching a stack the paved path covers (Zod, React,
Fastify, Drizzle…), with all four marketplace plugins loaded.

**Input:** any feature run that reaches the planner and an implementer.

**Passes when:**
- Every skill reference — in a plan's `Skills to use`, in an agent prompt, and in the
  agent's own reads — is the **full** `engineering-paved-path:<skill>` id.
- Every `subagent_type` is the full `<plugin>:<agent>` id, with the **owning** plugin's
  prefix: `sdd-engineering:implementer`, but `research-tools:researcher` and
  `architecture-review:architecture-reviewer`.
- The run produces **no missing-skill warning** and no `Agent type … not found` error.
- No agent declares a `skills:` frontmatter block.

**Fails when:**
- A bare `zod` / `typescript-expert` appears anywhere. It resolves against nothing and
  fails as a missing skill; a plan that names one hands every downstream implementer the
  same broken id.
- A bare `subagent_type` is dispatched. There is no bare-name fallback — verified against
  Claude Code 2.1.212:
  ```
  Agent type 'implementer' not found. Available agents: architecture-review:architecture-reviewer,
  … sdd-engineering:implementer, …
  ```
- A dependency plugin's agent is dispatched under an `sdd-engineering:` prefix. The
  prefix is the plugin that **ships** the agent, not the one that calls it.
- An agent preloads the routing table via `skills:` frontmatter. That re-bills every
  listed skill as cache-read on **every turn** of an opus agent — see
  [cost-discipline.md](../skills/ship-feature/references/cost-discipline.md). The routing
  table is read-on-demand by design; preloading it is a regression even though nothing
  visibly breaks.

> Cheap to check statically before you run anything — grep the briefs for a bare id:
> ```sh
> claude --plugin-dir ./plugins/engineering-paved-path --plugin-dir ./plugins/research-tools \
>        --plugin-dir ./plugins/architecture-review --plugin-dir ./plugins/sdd-engineering \
>        -p "List every skill and agent you can see with its exact fully-qualified name."
> ```
> Every id the briefs name must appear verbatim in that list.

---

## E14 — An unrelated request does not wake the pipeline

**Component:** `ship-feature` triggering (its `description`)
**Repo shape:** any. `sdd-engineering` installed and enabled.

**Input:** run each of these in a fresh session, verbatim:
- `what does this repo do?`
- `fix the typo in the README heading`
- `rename getUser to fetchUser in src/api.ts`

**Passes when:**
- None of them activates `ship-feature`. No spec, no plan, no approval gate, no subagent
  fan-out.
- The question is answered, or the one-line edit is simply made.
- On a borderline request the session may *offer* the pipeline — offering is not
  activating.

**Fails when:**
- Any of them spins up the pipeline. A rename does not need a spec, a plan, and three
  reviewers; the skill's own "What this skill is NOT for" section says so.
- It asks a clarifying question in order to justify starting the pipeline.

> A skill that fires on everything gets uninstalled. Over-triggering is the failure mode
> that costs a user real money on a typo fix, and the only case here scored on the
> pipeline **not running at all**.
