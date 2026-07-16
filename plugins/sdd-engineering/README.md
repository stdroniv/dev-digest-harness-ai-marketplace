# sdd-engineering

Spec-driven development, end to end: a feature request becomes an agreed spec, a verified
plan, an implementation, and a review gate — with a human deciding at the two moments that
matter.

Owner: Platform Engineering (see [CODEOWNERS](../../.github/CODEOWNERS)).

## Why this exists

Handing a feature to one agent and hoping produces code nobody agreed to. The failure is
never "the model could not write the function" — it is that nobody pinned down what the
feature was, so the disagreement surfaces at review, after the work.

This pipeline puts the disagreement first. The spec is argued before a plan exists; the
plan is checked against the spec before code exists; the code is checked against the plan
before merge. Each gate is cheap in the order it runs and expensive in any other.

## The pipeline

```
                                  ┌─ [SPEC APPROVAL] ─┐        ┌─ [PLAN APPROVAL] ─┐
                                  │      human        │        │      human        │
 request → researcher† → spec-creator → implementation-planner → spec-conformance → implementer(s)
                                                                                         │
                                                        ┌────────────────────────────────┘
                                                        ▼
                                       test-writer† → ‖ plan-verifier
                                                        architecture-reviewer
                                                        security-reviewer†  ‖ → gate → loop back (≤3)
                                                                                        │
                                                                              doc-writer† → report
```

`†` optional — the step is skipped, and the skip is reported, when the agent is not installed.

Invoke it:

```
/sdd-engineering:ship-feature <your feature request>
```

## What's in it

| Component | Role |
|---|---|
| `ship-feature` (skill) | The orchestrator. Owns the gates, the fan-out, the loop-back. |
| `spec-creator` (agent) | Request → testable spec with EARS acceptance criteria. WHAT and WHY only. |
| `implementation-planner` (agent) | Spec → phased plan with a dependency DAG and per-task owned paths. |
| `spec-conformance` (agent) | Does the plan cover every AC? Checked *before* any code. |
| `implementer` (agent) | Executes the plan. Verifies. Never invents scope. |
| `plan-verifier` (agent) | Does the code satisfy the plan? Plus the reverse: what did we build that nobody asked for? |
| `workflow-retro` (skill) | Manual post-mortem of a finished run. `/sdd-engineering:workflow-retro` |
| `engineering-insights` (skill) | Records a durable lesson so the next session starts knowing it. |

## Install

```
/plugin install sdd-engineering@dev-digest-harness
```

Dependencies install with it: `engineering-paved-path`, `research-tools`,
`architecture-review` — each constrained to `^1.0.0`. Requires Claude Code >= 2.1.196;
see [COMPATIBILITY.md](COMPATIBILITY.md).

## It does not know your repository — by design

These agents were extracted from a codebase they knew intimately: which folder held the
API, what port it used, what the test-file suffix meant. That knowledge made them sharp
there and useless anywhere else.

So it moved out of the agents. `ship-feature` now runs a discovery step once per run —
reading your `CLAUDE.md`, `README.md`, and package layout to build a project profile — and
passes it down to every subagent. The agents are the procedure; your repo supplies the
facts. See [`references/project-discovery.md`](references/project-discovery.md).

**Practical consequence:** the pipeline works best in a repo with a real `CLAUDE.md`. With
one, discovery is accurate and cheap. Without one, the agents infer from your layout, tell
you they are inferring, and ask when a convention matters and cannot be found. They will
not silently guess where your plans go and build on it.

## Optional agents

`test-writer`, `security-reviewer`, and `doc-writer` are **not** part of this release and
may not be installed. `ship-feature` checks before dispatching and skips the step if
absent — announcing the skip during the run and recording it in the final report.

The skip is never silent. A run that authored no tests says so unmissably in its report,
and never reports plain "merge-ready" — shipping unverified code while implying it was
tested is the worst thing this pipeline could do.

## Versioning

Dependencies are constrained to `^1.0.0`. Constraints resolve against git tags
(`<plugin>--v<version>`), not against `plugin.json`, so each dependency is tagged at
`1.0.0` as part of this release. Releasing a dependency without tagging it disables this
plugin at install with `no-matching-tag` — see [docs/RELEASES.md](../../docs/RELEASES.md).

Requires **Claude Code >= 2.1.196**; older builds ignore the dependency block rather than
rejecting it, which fails quietly. See [COMPATIBILITY.md](COMPATIBILITY.md).

## Permissions

Agents and skills only — no hooks, no MCP servers, no `settings.json`, no `bin/`.

`workflow-retro` ships a Python script (`skills/workflow-retro/scripts/analyze_journals.py`,
invoked through `${CLAUDE_SKILL_DIR}` so it resolves inside the plugin cache) that reads
Claude Code session journals from your local config directory to reconstruct run metrics.
It is read-only, runs locally, and makes no network calls. Its `researcher` dependency
reaches the network on `[web]` lookups only.

**No credentials.** This plugin declares no secret slot and its manifest holds no
credential. Should a component ever need one, the manifest may name the slot — the value
stays outside the repo. See [COMPATIBILITY.md](COMPATIBILITY.md#credentials).
