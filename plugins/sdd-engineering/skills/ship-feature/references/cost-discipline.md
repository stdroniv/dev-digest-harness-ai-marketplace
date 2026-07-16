# Cost & robustness discipline — full rationale

> Pulled out of `SKILL.md` to keep the pipeline's hot path lean. Read this before a
> **large, multi-module, or loop-heavy** run; the headline rules live in the skill body,
> the *why* and the rest live here.

A real run's telemetry showed **cache-read is ~93% of all tokens** — i.e. each agent's
context is re-billed on *every* turn — so the cost driver is **conversation length ×
context size**, not the model tier (each agent's tier is already set in its own
definition: `researcher` + the executors (`implementer`/`test-writer`) + every gate
(`plan-verifier`/`spec-conformance`/`architecture-reviewer`/`security-reviewer`)→Sonnet,
and only `spec-creator`/`implementation-planner`→Opus — a *generic* built-in subagent has
no tier of its own and inherits the orchestrator's model, so it runs on Opus when you do).
Optimise for *fewer, shorter, leaner* agent turns and *zero wasted runs*:

- **Discover the repository once, in the orchestrator.** Establishing the module map,
  stack, commands, and artifact locations means reading the repo's `CLAUDE.md` and
  manifests — real tokens. Do it once in the main session and paste the resulting profile
  into every subagent's prompt; a dozen leaf agents each rediscovering the same facts pays
  that cost a dozen times, and they may not even agree with each other. Tell each agent the
  profile is authoritative so it doesn't re-read to confirm.
- **One-retry-then-DIY on a dropped agent.** If a long single-shot agent (esp.
  `spec-creator` or `implementation-planner`) drops its connection, resume it **at most
  once**. If it drops again,
  write the artifact yourself from the context you already gathered — don't burn a
  third resume (a real run wasted ~8.6M tokens / ~26 min doing exactly that).
- **Split a big implementation by layer — and the threshold is files/turns, not just
  modules.** When a feature spans **more than one module** of the repo's map **or ~15+
  files or a single run you expect to exceed ~150 turns**, spawn
  focused `implementer` tasks instead of one mega-run — cache-read grows super-linearly
  with turn count, so three ~100-turn agents cost far less than one ~300-turn agent.
  **Phases sharing a wire-contract *file* (a hooks / contracts / routes module both
  touch) is not an exception to the split** — thread that exact hook/route/type signature
  forward (see the interface-threading rule at the end of this bullet) and split anyway. A
  real run kept one **337-turn / ~$54** implementer as a single agent *precisely because*
  two of its phases both edited one shared module; threading that module's signature
  into a second agent would have been far cheaper than the one long context.
  **This applies *within* a single module too:** a big single-module build (e.g. a UI
  screen with localisation + navigation + hooks + ~6 components + the page/wiring) is over
  the threshold even though it's one module — split it **by sub-layer**
  (foundation: localisation + navigation + hooks → components → page/state-wiring), not
  into one mega-agent. Two reasons: cost, and **blast radius** — in one real run a single
  ~274-turn / ~40-file implementer dropped its connection near the end, losing the
  final wiring task and forcing a recovery agent that re-read ~11M cache-read of
  siblings the first had already built. A sub-layer split caps each agent's turns *and*
  makes a mid-run drop recoverable to one small piece. **Below the threshold, keep a
  single run** (splitting re-pays base-context load + handoff per agent). When you split,
  run the layers/sub-layers in **the dependency order the repo's module map implies**
  (shared/core → server → UI; within a UI layer: foundation → components → wiring) and
  thread the *real*
  exported signature / route contract / component API from each layer into the next
  agent's prompt — subagents share no memory, so a downstream agent that has to guess the
  upstream interface re-introduces the drift the split was meant to avoid.
- **Keep each agent's context lean.** Hand it the **exact file list / paths** (you
  already compute the changed-file set) and the project profile so it acts instead of
  rediscovering. Tell
  `implementer`/`test-writer` to run the heaviest verification (full suites) as a
  **final** step and not re-dump large tool output mid-run — every dumped log is
  re-billed on all later turns.
- **Scope re-validation tightly — and never by *resuming* a reviewer.** On loop-back,
  re-check with "confirm **only** these findings on these changed files," never a full
  re-review. But spawn a **fresh, minimal** agent (or just `Read` the 2–3 changed files
  yourself) — resuming a prior reviewer re-bills its entire transcript as cache-read, so
  a 4-item confirmation can cost as much as the original full pass (one run's "scoped"
  re-verify came in *higher* than the verification it was shrinking). If you already hold
  the evidence the re-check would gather — e.g. the implementer's pasted green test output
  for exactly those items — skip the agent entirely. (This is the same fresh-minimal-agent
  rule the *adjudicate-a-dispute* step relies on.)
- **Lean exploration — and keep it off the Opus tier.** Prefer **1–2 broader explorers**
  (or pass a shared file list so they don't each re-read the same files) over many
  overlapping ones. Spawn the tiered **`researcher`** (Sonnet), *not* a generic built-in
  subagent — the latter inherits the orchestrator's model, so exploring
  while you're on Opus makes Opus explorers (a real run paid **~$9** for three broad file
  sweeps that ran on the orchestrator's Opus instead of Sonnet). For a reasoning-light
  sweep, pass an explicit `model: haiku` on the `Task` call.
- **Don't background a verification the pipeline just waits on.** Run a sub-agent in the
  background only when there's *parallel* work to overlap it with. In a serial step (e.g.
  a single re-verify before the report) backgrounding buys nothing and can deadlock a Stop
  hook into pinging you each idle turn — and every idle turn re-bills the orchestrator's
  (large) context, the most expensive thing in the run. Run it foreground, or verify
  inline. And never *poll* a background agent — completion notifications fire automatically.
- **No nested subagents — the main session is the only orchestrator.** Leaf agents don't
  hold `Task` for a reason: a sub-orchestrator spawns runs you can't see, size, or tier,
  and its own long context re-bills on top of theirs. Every fan-out happens in the main
  session, where you can count what's running. This invariant is what makes the pipeline's
  cost bounded and predictable rather than recursive.
- **Escalate model only on purpose.** Per-agent `model:` is already tuned; override
  via the `Task` `model` param only to bump `implementer` to `opus` when the plan
  flags genuinely hard/ambiguous work — the default Sonnet handles mechanical edits.
- **Tier EVERY dispatch — a bare `Agent`/`Task` inherits Opus.** The exploration rule above
  is one case of a general one: `subagent_type` is what selects the tuned per-agent model, so
  a dispatch with **no** `subagent_type` (or `general-purpose`) silently runs on the
  orchestrator's tier — Opus on an Opus main loop. A real pipeline run dispatched its
  Wave-4/5 UI-component agents without `subagent_type: implementer`; they ran on Opus (the
  `/cost` panel's "general-purpose" line, ~8% of usage) while the correctly-typed Waves 1–3 ran
  Sonnet at equal quality — avoidable spend. Always: code → `subagent_type: implementer`,
  exploration → `researcher`; then **verify with `/cost`** that the code waves landed under
  `implementer` (Sonnet), not `general-purpose`.
- **The Opus orchestrator is itself the single biggest line — keep it short.** `/cost` on that
  run: **~71% of $ was Opus** and **~65% of usage sat above 150k context**, dominated by the
  main loop's own re-billed transcript (its cache-read rivalled *all* subagents combined). So
  when agents are available, **delegate even recovery and follow-up refactors to a fresh Sonnet
  `implementer`** rather than doing them inline in the long Opus main loop — that run's
  hand-done T18/T19 recovery + the three review follow-ups landed on the orchestrator and became
  its largest cost. `/compact` mid-task and `/clear` between tasks to stop re-billing context
  you no longer need.
