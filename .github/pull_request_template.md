## What changed?

<!-- One or two sentences. If you're adding a plugin, say which teams asked for it. -->

## Why is this not a breaking change?

<!-- If it IS breaking: say what users must do, bump MAJOR, and put a migration note in
     the CHANGELOG. Removing or renaming a skill is breaking. -->

## What permissions and dependencies does it add?

<!-- "None" is a fine answer. Name any new dependency and why it's constrained the way
     it is. Any new hooks/.mcp.json/bin/settings.json goes in the security box below. -->

## Checklist

- [ ] **Version bumped** in `plugins/<name>/.claude-plugin/plugin.json` — required for
      *any* change under `plugins/`, including README edits. Without it, Claude Code
      serves the cached copy and this ships to nobody.
- [ ] `CHANGELOG.md` updated with an entry for the new version
- [ ] `node scripts/lint-marketplace.mjs` passes
- [ ] Installed in a real project and every skill exercised — not just linted
- [ ] Updated from the previous version without breakage (changes to existing plugins)
- [ ] Skill `description` frontmatter says **when to use** the skill, not just what it is
- [ ] No absolute paths (`${CLAUDE_PLUGIN_ROOT}` instead) and no secrets (`userConfig`
      with `"sensitive": true` instead)

### Adding a new plugin?

- [ ] Scope agreed with platform engineering (common, shared problem — not team-specific)
- [ ] `name` is final — plugin names are immutable and renaming breaks existing installs
- [ ] Registered in `.claude-plugin/marketplace.json` with a bare `source`, no `version`
- [ ] Owning team added to `.github/CODEOWNERS`

### Security surfaces

- [ ] This PR adds **no** `hooks/hooks.json`, `.mcp.json`, `bin/`, or `settings.json`

If any of those are present, request platform engineering **and** security review — plugins
run unsandboxed on every installer's machine. See [SECURITY.md](../SECURITY.md).

### After merge

- [ ] Tag the release: `cd plugins/<name> && claude plugin tag --push`

Auto-update is off by default for this marketplace, so merging does not ship. If the change
is urgent, tell people to run `claude plugin update <name>`. See
[docs/RELEASES.md](../docs/RELEASES.md).
