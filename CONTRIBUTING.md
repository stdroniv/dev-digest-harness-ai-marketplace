# Contributing a plugin

This is the **path** from idea to merged PR. For the **rules** — naming, required
structure, manifest fields, dependencies — see [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md).
For versioning, tagging, and rollback, see [docs/RELEASES.md](docs/RELEASES.md).

## First: is it in scope?

**This marketplace is for common, shared problems.** Workflows specific to one team
belong in that team's own repository, not here — you can point Claude Code at any repo
as a marketplace, so nothing is lost by keeping it local.

Rough test: if you cannot name two teams who would install it, it is not a fit yet.

**Talk to platform engineering before you write code.** Scope is the one thing CI cannot
check for you, and it is the most expensive thing to get wrong — a plugin that lands and
then has to be removed breaks existing installs (see [Renaming and removal](#renaming-and-removal)).

## Adding a plugin

1. **Copy the reference layout:**
   ```bash
   cp -r tests/fixtures/valid-plugin plugins/<your-plugin>
   ```
   `tests/fixtures/valid-plugin/` is the canonical structure and is verified by CI on
   every run, so it cannot drift out of date.

2. **Edit `plugins/<your-plugin>/.claude-plugin/plugin.json`.** The `name` must match the
   directory name.

   > **Plugin names are immutable.** `name` is the skill namespace (`/<name>:<skill>`) and
   > the install identity. Renaming later breaks every existing install. Choose carefully
   > now; use `displayName` if you only want to change the label shown in the UI.

3. **Write your skills** in `skills/<skill-name>/SKILL.md`, and keep `CHANGELOG.md`
   current. The frontmatter `description` is the *only* thing Claude reads when deciding
   whether to invoke a skill — write it as **when to use this**, not what it is. See
   [PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md) for the full rules on naming,
   structure, dependencies, absolute paths, and secrets.

4. **Register it** in `.claude-plugin/marketplace.json`:
   ```jsonc
   { "name": "your-plugin", "source": "your-plugin", "description": "…", "category": "…" }
   ```
   `source` is the **bare plugin name** — `metadata.pluginRoot` already prepends
   `./plugins`. Do **not** add a `version` field here (see below).

5. **Claim ownership** in `.github/CODEOWNERS`:
   ```
   /plugins/your-plugin/    @<org>/your-team
   ```
   CI rejects any plugin without an owner.

6. **Open a PR.** Because step 4 touches the registry, platform engineering is pulled in
   automatically as a reviewer.

## The version bump rule

**Every change to `plugins/<name>/` must bump `version` in that plugin's `plugin.json`.**

This is not bookkeeping. Claude Code **caches plugins by version string**: if you merge a
change without bumping the version, users keep the cached copy and *your change ships to
nobody*. It looks exactly like your change was ignored, and there is no error anywhere.

- Follow semver: PATCH for fixes, MINOR for new features, MAJOR for breaking changes.
- Start new plugins at `0.1.0`.
- The version must go **up**. A downgrade re-serves a stale cached copy.
- README-only changes count. No exceptions — the rule is easier to follow than to argue about.
- Never set `version` in the marketplace entry: `plugin.json` silently wins and masks it.
- Record what changed in the plugin's `CHANGELOG.md`. CI rejects a bump with no entry.

CI enforces this by diffing against the merge-base, so a forgotten bump is a red check
rather than a silent non-delivery.

The same cache behavior means **you cannot roll back by reverting** — a revert re-serves
the cached bad version. Rollback is always roll-*forward* to a higher version. See
[docs/RELEASES.md](docs/RELEASES.md).

## Layout rules

Only `plugin.json` goes inside `.claude-plugin/`. Everything else lives at the **plugin
root**:

```
plugins/your-plugin/
├── .claude-plugin/
│   └── plugin.json        # nothing else in here
├── skills/<name>/SKILL.md
├── agents/*.md
├── hooks/hooks.json       # security review required
├── .mcp.json              # security review required
├── CHANGELOG.md           # required
└── README.md
```

Putting `skills/` or `agents/` under `.claude-plugin/` is the single most common mistake
— Claude Code will silently not load them. The linter catches it.

Full rules, including dependencies and the ban on absolute paths and secrets:
[docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md).

## Testing locally

```bash
claude --plugin-dir ./plugins/your-plugin      # load without installing
```

Then `/your-plugin:your-skill` to invoke it. `/reload-plugins` picks up edits without a
restart. Repeat `--plugin-dir` to load several at once. A `--plugin-dir` copy shadows an
installed plugin of the same name, so you can test changes without uninstalling first.

Before pushing:

```bash
node scripts/lint-marketplace.mjs                              # structure + registry + bump
claude plugin validate ./plugins/your-plugin --strict          # manifest schema
```

Both are required, and neither is sufficient. Also **install it in a real project** and
exercise every skill, and — for a change to an existing plugin — **update from the previous
version** to confirm nothing breaks. If a skill's output quality matters, run it against a
few real cases and paste the results in the PR. Linting proves a plugin parses; it cannot
tell you the skill produces plausible garbage. See
[PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md#before-you-request-review).

`claude plugin init <name>` also scaffolds a plugin if you prefer starting from scratch.

## Security surfaces

Plugins run unsandboxed with full trust in every installer's environment. Any PR adding
`hooks/hooks.json`, `.mcp.json`, `bin/`, or `settings.json` needs platform engineering
**and** security review, regardless of CODEOWNERS. Read [SECURITY.md](SECURITY.md) before
adding one.

Never commit secrets. Declare them as `userConfig` with `"sensitive": true` and Claude
Code will prompt the user and store the value for them.

## Renaming and removal

Both break existing installs, so they need a `renames` entry in `marketplace.json`:

```jsonc
"renames": {
  "old-name": "new-name",   // renamed
  "dead-plugin": null       // removed for good
}
```

CI requires this and flags removals for platform engineering review.
