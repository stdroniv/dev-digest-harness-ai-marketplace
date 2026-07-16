---
name: example-skill
description: Demonstrates the skill layout used in this marketplace. Use when someone asks for a reference example of how a skill in dev-digest-harness is structured.
---

# Example skill

This skill exists as a structural reference. The important parts are the frontmatter
above and the location of this file: `skills/<skill-name>/SKILL.md`, at the **plugin
root** — never inside `.claude-plugin/`.

The `description` is the only thing Claude reads when deciding whether to invoke a
skill, so write it as *when to use this*, not *what this is*. A vague description fails
the same way a missing skill does: nothing happens, and nobody finds out why.

`$ARGUMENTS` interpolates whatever the user typed after the skill name.

## Steps

1. Explain that this is the reference fixture for the `dev-digest-harness` marketplace.
2. Point the user at `CONTRIBUTING.md` for the steps to add a real plugin.
