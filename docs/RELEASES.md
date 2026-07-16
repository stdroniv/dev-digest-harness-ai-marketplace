# Releases

How a change in this repo reaches an engineer's machine — and how to get a bad one back.

## The mental model

Claude Code **caches plugins by version string**. That single fact explains every rule here:

- Merging without bumping `version` ships **nothing**. Users keep the cached copy.
- Reverting a bad release ships **nothing**. The old version string is already cached.
- The version string, not the commit, is the unit of delivery.

Internalize that and the rest follows.

### Two axes, not one

The plugin version and the marketplace are versioned independently, and confusing them is
the most common way to think a change shipped when it didn't.

- A **plugin's `version`** describes the behavior of that one plugin. It is the unit users
  install and cache.
- A **commit or tag on this repo** fixes the state of the *catalog* — which plugins exist,
  where their sources point, what the entries say. It says nothing about what any
  installed plugin does.

Two consequences worth stating outright:

- **Changing one plugin does not version another.** An `engineering-paved-path` release
  leaves `sdd-engineering`'s version untouched, even though SDD depends on it — until SDD
  widens its own compatibility range, which is itself a change to SDD and needs its own
  bump.
- **Refreshing the marketplace does not update an installed plugin.** A refresh re-reads
  the catalog; it does not touch a plugin already cached on disk. That still takes
  `claude plugin update <plugin>` (see [Update](#update)).

## SemVer

Every plugin sets `version` in its own `.claude-plugin/plugin.json` and moves on its own
line. A change to one plugin never releases another.

| Bump | When | Example |
|---|---|---|
| PATCH `1.2.0 → 1.2.1` | Fix that doesn't change the interface | Skill description wording, bug fix, README |
| MINOR `1.2.1 → 1.3.0` | New capability, backward compatible | New skill, new optional `userConfig` |
| MAJOR `1.3.0 → 2.0.0` | Breaking | Removed/renamed a skill, new required config, changed output contract |

**Every change under `plugins/<name>/` needs a bump — including README-only edits.** No
exceptions. The rule is easier to follow than to argue about, and CI enforces it against
the merge-base. The version must go **up**: a downgrade re-serves a stale cached copy.

A MAJOR bump needs a migration note in the plugin's CHANGELOG saying what users must do.

## CHANGELOG

Every plugin has a `CHANGELOG.md`, newest first, with an entry for the current version.
CI rejects a bump with no matching entry.

```markdown
## 1.3.0

- Add `review-adr` skill for ADR checks.
- Fix `summarize` truncating long inputs.
```

This is the only place a user can see what they received. The version string alone tells
them nothing.

## Tags

Tag every release as `<plugin-name>--v<version>`:

```bash
cd plugins/architecture-review
claude plugin tag --push          # add --dry-run to preview
```

`claude plugin tag` derives the tag from the manifest, validates the plugin, requires a
clean working tree under the plugin directory, and refuses if the tag already exists. The
`<name>--v` prefix is what lets one repository host independent version lines.

`git tag architecture-review--v1.3.0` by hand is equivalent.

**Tagging is mandatory if any plugin depends on yours with a version constraint.**
Constraints resolve against *tags*, not `plugin.json`. An untagged plugin makes every
constrained dependent fail with `no-matching-tag`. If nothing depends on your plugin,
tagging is still worth it: it is what makes a release identifiable later.

## Update

**Auto-update is off by default for non-Anthropic marketplaces.** A merged, bumped, tagged
release does not reach anyone automatically. Users get it by either:

- enabling auto-update for the marketplace in `/plugin`, or
- running `claude plugin update <plugin>` (then `/reload-plugins` to pick up any newly
  added dependencies).

So "it's merged" is not "it's shipped." If a fix is urgent, tell people to run the update —
don't assume it lands. Admins can push a version fleet-wide via `enabledPlugins` in
managed settings; see [admin-rollout.md](admin-rollout.md).

## Rollback: roll **forward**, always

**You cannot roll back by reverting the commit.**

Reverting `1.2.1` back to `1.2.0` restores the old files, but every user who already has
`1.2.1` cached stays on `1.2.1` — Claude Code sees a version it already has and skips.
Worse, anyone who hasn't updated yet resolves `1.2.0`, which is *also* cached from before.
The bad code stays exactly where it is, and the repo now lies about what's deployed.

**The only rollback that reaches users is a new, higher version.**

```bash
# 1.2.1 is bad. Restore the good tree from 1.2.0 and ship it AS 1.2.2.
git revert <bad-commit>                                   # or: git checkout <good-sha> -- plugins/<name>
# bump plugin.json to 1.2.2 — NOT back to 1.2.0
# add a CHANGELOG entry: "1.2.2 — revert 1.2.1, which <what broke>"
git commit && git push                                    # open a PR as usual
cd plugins/<name> && claude plugin tag --push
```

Then **tell people to update** — auto-update is off by default, so a rollback that nobody
pulls is not a rollback.

### If the release is dangerous, not just broken

Rolling forward takes a PR and a user action. When a release is actively harmful — leaking
data, destructive commands — stop the spread first, then roll forward:

1. **Set the plugin to "Not available"** in Organization settings → Plugins. This blocks
   new installs immediately, without a merge.
2. For something severe, `blockedMarketplaces` in managed settings cuts the whole
   marketplace off — enforced on install, update, refresh, *and* auto-update, so it also
   stops a marketplace that was added earlier.
3. Then roll forward and tell people to update.

Note what this does and doesn't do: it stops **new** installs. Engineers who already have
the bad version keep it until they update. Assume the blast radius is everyone who
installed, and follow [SECURITY.md](../SECURITY.md) for anything involving credentials.

### Removing a plugin entirely

Delete the directory, remove the entry, and add a `renames` entry so existing installs
migrate instead of breaking:

```jsonc
"renames": { "dead-plugin": null }     // or "dead-plugin": "replacement-plugin"
```

CI requires this and flags removals for platform engineering review.

## Checklist

- [ ] `version` bumped in `plugin.json`, higher than before
- [ ] `CHANGELOG.md` entry for the new version; migration note if MAJOR
- [ ] `node scripts/lint-marketplace.mjs` passes
- [ ] `claude plugin validate ./plugins/<name> --strict` passes
- [ ] Installed and exercised in a real project
- [ ] Updated from the previous version without breakage
- [ ] Tagged after merge: `claude plugin tag --push`
