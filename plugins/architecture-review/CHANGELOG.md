# Changelog

All notable changes to this plugin. Newest first. Every version bump needs an entry —
the version string is what users receive, so this is the only place they can see what
they got. See [docs/RELEASES.md](../../docs/RELEASES.md).

## 1.0.1

- Docs: the agent is dispatched as `architecture-review:architecture-reviewer`. A plugin
  agent is namespaced by the plugin that ships it and there is no bare-name fallback, so
  the `architecture-reviewer` the README told you to dispatch was rejected with
  `Agent type 'architecture-reviewer' not found`.
- The agent's own skill routing now names `engineering-paved-path:typescript-expert` in
  full, and states that this is a soft if-present reference — `engineering-paved-path` is
  not a dependency, so a missing-skill result there is a normal "not installed".

## 1.0.0

- Initial release. Extracted from the DevDigest harness.
- Adds the `architecture-reviewer` subagent: read-only review reporting findings with a
  severity, the principle violated, and a direction to move — never a rewrite.
- Editorial pass for portability: dropped the two repository-specific rule slugs
  (`reviewer-core-zero-io`, `reviewer-core-ground-findings-gate`), replaced the hardcoded
  findings-severity contract path with the plugin's own severity scale, and replaced the
  named-module examples with a rule that the agent discovers the module map from the host
  repository's own `CLAUDE.md` / `README.md` / package layout.
