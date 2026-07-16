# Compatibility

**Requires Claude Code >= 2.1.196.** Verified against 2.1.211.

## Why there is no version floor in the manifest

There is no supported way to declare one. `plugin.json` has no `compatibility` field —
`claude plugin validate --strict` accepts the key but reports it as unknown:

```
⚠ compatibility: Unknown field (commonly seen in an MCPB/DXT manifest).
  Claude Code ignores unrecognized fields at load time, so it's safe to keep.
```

"Safe to keep" is precisely the problem: a floor that is *ignored at load time* is not a
floor. Writing one into the manifest would look like enforcement while enforcing nothing,
and the failure it is supposed to prevent would still happen — just with a manifest that
implies it couldn't. So the requirement lives here, in the file a human reads before
installing, and the checklist below is how you confirm it.

## What the floor buys you

This plugin is the only one in this marketplace that needs it. The other three ship
agents and skills and run anywhere; `sdd-engineering` is the one that *depends* on them:

| Needed for | What it is |
|---|---|
| Version-constrained dependencies | `{ "name": "research-tools", "version": "^1.0.0" }` — the range, not just the name |
| Resolution against tags | Constraints resolve against `<plugin>--v<version>` git tags, including from a local-folder marketplace |
| Coordinated enable/disable | Enabling this plugin enables what it depends on; disabling releases them together |

## On older builds

Unrecognized manifest fields are ignored rather than rejected, which is the trap: the
plugin *installs*. What breaks is quieter.

- A build with no dependency support ignores the `dependencies` block. `ship-feature`
  then dispatches `researcher` and `architecture-reviewer` that were never installed.
  The pipeline degrades to its optional-agent path — it announces the skip and records it
  in the final report — so you get a run that is honest about being partial rather than a
  crash. That is the good case, and it is still not the pipeline you asked for.
- A build that understands constraints but finds no matching tag disables this plugin with
  `no-matching-tag`. See [docs/RELEASES.md](../../docs/RELEASES.md) — every release of a
  constrained dependency must be tagged.

## Checking

```bash
claude --version                 # must be >= 2.1.196
/plugin                          # dependencies listed and enabled alongside this plugin
```

If `/plugin` shows `sdd-engineering` enabled while `research-tools` is absent, dependency
resolution is not running: upgrade before trusting a pipeline run.

## Credentials

None. This plugin declares no secret slot, reads no token, and its manifest contains no
credential. Its only network reach is the `researcher` agent's `[web]` lookups
(`WebSearch` / `WebFetch`), which are unauthenticated. If a future component needs a
secret, the manifest may *name* the slot — never hold the value.
