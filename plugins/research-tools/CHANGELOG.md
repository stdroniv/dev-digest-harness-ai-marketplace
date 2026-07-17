# Changelog

All notable changes to this plugin. Newest first. Every version bump needs an entry —
the version string is what users receive, so this is the only place they can see what
they got. See [docs/RELEASES.md](../../docs/RELEASES.md).

## 1.0.1

- Docs: the agent is dispatched as `research-tools:researcher`. A plugin agent is
  namespaced by the plugin that ships it and there is no bare-name fallback, so the
  `researcher` the README told you to dispatch was rejected with
  `Agent type 'researcher' not found`.

## 1.0.0

- Initial release. Extracted from the DevDigest harness.
- Adds the `researcher` subagent: read-only `[code]` / `[web]` lookups returning a
  fixed Answer / Evidence / Edge cases / Confidence template.
- Imported verbatim — the source agent carried no project-specific coupling.
