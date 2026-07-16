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
