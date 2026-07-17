# Changelog

All notable changes to this plugin. Newest first. Every version bump needs an entry —
the version string is what users receive, so this is the only place they can see what
they got. See [docs/RELEASES.md](../../docs/RELEASES.md).

## 1.0.1

- **Fixed: every agent dispatch in the pipeline named an id that does not resolve.** A
  plugin agent is registered as `<plugin>:<agent>` and there is no bare-name fallback, so
  `subagent_type: implementer` fails with `Agent type 'implementer' not found` — as did
  every other dispatch `ship-feature` specified. `ship-feature` now carries an **Agent ids**
  table as the canonical source (`sdd-engineering:implementer`,
  `research-tools:researcher`, `architecture-review:architecture-reviewer` — note the
  dependency plugins' prefixes are *not* `sdd-engineering:`), and `spec-creator` and
  `implementation-planner` name `research-tools:researcher` in full when they delegate.
- **Fixed: skill routing tables named bare skills.** `zod`, `typescript-expert`, and the
  rest are namespaced by the plugin that ships them; the tables in `ship-feature`,
  `implementer`, and `implementation-planner` now name `engineering-paved-path:<skill>`.
  A plan that named a bare skill handed the same broken id to every downstream implementer.
  Skills remain **read-on-demand** — no agent declares a `skills:` frontmatter block, which
  would re-bill every listed skill as cache-read on every turn of an opus agent.
- Adds eval cases E7–E14, covering the behaviours the E1–E6 set did not: spec clarification
  and the no-HOW rule (E7), planning against the spec rather than re-deriving it (E8),
  typed implementer dispatch (E9), the dependency plugin's review gate (E10), AC-vs-code
  verification (E11), the retro never self-triggering (E12), namespaced id resolution
  (E13), and non-activation on an unrelated request (E14).

## 1.0.0

- Initial release. Extracted from the DevDigest harness.
- Adds the `/sdd-engineering:ship-feature` orchestrator and its pipeline: `spec-creator` →
  [spec approval] → `implementation-planner` → `spec-conformance` → [plan approval] →
  `implementer` → review gate → `plan-verifier`.
- Adds `/sdd-engineering:workflow-retro`, a manual post-mortem for a finished run, and the
  `engineering-insights` skill for recording durable lessons between sessions.
- Depends on `engineering-paved-path`, `research-tools`, and `architecture-review`, each
  constrained to `^1.0.0`. Constraints resolve against the `<plugin>--v<version>` tags cut
  for this release; see [COMPATIBILITY.md](COMPATIBILITY.md) and
  [docs/RELEASES.md](../../docs/RELEASES.md).
  `test-writer`, `security-reviewer`, and `doc-writer` are **optional**: their pipeline
  steps are skipped when the agents are not installed.
- Requires Claude Code >= 2.1.196 — the dependency block above is inert on older builds.
  See [COMPATIBILITY.md](COMPATIBILITY.md).
- `workflow-retro` locates its bundled analysis script through `${CLAUDE_SKILL_DIR}`, the
  skill's own base directory inside the plugin cache, rather than a path spelled relative
  to the plugin root.
- Adds `evals/` — a manual, human-run harness for the two skills whose output quality is
  judged rather than asserted. There is no automated eval gate.
- Renamed `implementation-plan` to `implementation-planner`. The name describes the agent,
  not the artifact it writes, matching the other agents in the pipeline.
- Editorial pass for portability — the substantive part of this release:
  - Agents no longer embed one repository's module map, package names, ports, commands,
    or file paths. They discover the host repository's layout, stack, and conventions from
    its own `CLAUDE.md` / `README.md` / package layout at run time. See
    `references/project-discovery.md`.
  - `workflow-retro` no longer hardcodes an author's project slug when locating transcript
    journals; it derives the path from the current working directory. This was a live bug
    that made the deep-mode analysis silently find nothing on any other machine.
  - `engineering-insights` no longer hardcodes a fixed module list for locating
    `INSIGHTS.md`; it resolves the nearest one and falls back to the repository root.
  - Skill routing tables now name `engineering-paved-path` skills rather than restating
    their content.
