## What does this change?

<!-- One or two sentences. If you're adding a plugin, say which teams asked for it. -->

## Checklist

- [ ] **Version bumped** in `plugins/<name>/.claude-plugin/plugin.json` — required for
      *any* change under `plugins/`, including README edits. Without it, Claude Code
      serves the cached copy and this ships to nobody.
- [ ] Tested locally with `claude --plugin-dir ./plugins/<name>`
- [ ] `node scripts/lint-marketplace.mjs` passes
- [ ] Skill `description` frontmatter says **when to use** the skill, not just what it is

### Adding a new plugin?

- [ ] Scope agreed with platform engineering (common, shared problem — not team-specific)
- [ ] `name` is final — plugin names are immutable and renaming breaks existing installs
- [ ] Registered in `.claude-plugin/marketplace.json` with a bare `source`, no `version`
- [ ] Owning team added to `.github/CODEOWNERS`

### Security surfaces

- [ ] This PR adds **no** `hooks/hooks.json`, `.mcp.json`, `bin/`, or `settings.json`

If any of those are present, tick nothing above and request platform engineering **and**
security review — plugins run unsandboxed on every installer's machine. See
[SECURITY.md](../SECURITY.md).
