# Valid Plugin

Reference layout for plugins in this marketplace. Copy this directory to start a new one,
then rename it — the directory name and `plugin.json` `name` must match, and the name is
immutable once merged.

CI lints and validates this fixture on every run, so it cannot drift from the rules in
[docs/PLUGIN-GUIDELINES.md](../../../docs/PLUGIN-GUIDELINES.md).

## What it does

Nothing useful — it exists to show the layout:

```
valid-plugin/
├── .claude-plugin/
│   └── plugin.json        # manifest — NOTHING else in this directory
├── skills/example-skill/SKILL.md
├── agents/example-agent.md
├── CHANGELOG.md
└── README.md
```

`skills/`, `agents/`, `commands/`, and `hooks/` live at the **plugin root**. Putting them
inside `.claude-plugin/` fails silently — Claude Code never loads them and never says why.

## After you copy it

1. Rename the directory and set a matching `name` in `plugin.json`.
2. Rewrite the skill `description` as *when to use this* — it is the only thing Claude
   reads when deciding whether to invoke the skill.
3. Register it in [`.claude-plugin/marketplace.json`](../../../.claude-plugin/marketplace.json)
   with `"source": "./plugins/<name>"` — a repo-root-relative path, not a bare name.
4. Add a CODEOWNERS line so the plugin has an owning team.
5. Run `node scripts/lint-marketplace.mjs` and install it for real before requesting review.

## Owner

Platform Engineering (platform-eng@example.com)
