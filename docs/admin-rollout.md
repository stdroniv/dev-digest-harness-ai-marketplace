# Admin rollout

How to get `dev-digest-harness` onto engineers' machines and keep the fleet's plugin
sources under control. Audience: whoever administers Claude Code for the org.

## Prerequisites

- **The repo must be private or internal, in a GitHub organization.** Public repos are not
  permitted for organization marketplaces, and a personal-account repo cannot be synced as
  one or marked internal.
- Cowork and Skills must both be enabled for the organization before plugin marketplaces
  work at all.

## Option A: the admin UI (recommended to start)

**Organization settings → Plugins.** Connect the repo (github.com or GitHub Enterprise
Server) and enable automatic syncing.

Each plugin gets an installation preference:

| Preference | Effect |
|---|---|
| Installed by default | Engineers get it without doing anything; can remove it |
| Available for install | Opt-in from `/plugin` |
| Not available | Hidden; blocks new installs (use to pull a bad plugin) |
| Required | Always on; cannot be removed |

Changes take effect on each member's next session or plugin refresh. Enterprise plans can
override preferences per group; when someone is in several groups, the **most permissive**
setting wins.

## Option B: managed settings (fleet-wide policy)

Managed settings are the highest-precedence scope — above CLI args, local, project, and
user settings — and cannot be overridden by engineers.

| Platform | Path |
|---|---|
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` (+ `managed-settings.d/`) |
| Linux / WSL | `/etc/claude-code/managed-settings.json` (+ `managed-settings.d/`) |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` (+ `managed-settings.d\`) |

Deliver via MDM: macOS uses the managed-preferences domain `com.anthropic.claudecode`
(Jamf, Kandji); Windows uses `HKLM\SOFTWARE\Policies\ClaudeCode` with a `Settings` value
containing the JSON (Group Policy, Intune). Anthropic publishes starter templates at
[anthropics/claude-code/examples/mdm](https://github.com/anthropics/claude-code/tree/main/examples/mdm).

### Worked example

```jsonc
{
  // Auto-inject our marketplace: engineers never have to discover or add it.
  "extraKnownMarketplaces": {
    "dev-digest-harness": {
      "source": { "source": "github", "repo": "<org>/dev-digest-harness-ai-marketplace" }
    }
  },

  // Allowlist: with this on, engineers can only add marketplaces listed above
  // (plus Anthropic's official ones).
  "strictKnownMarketplaces": true
}
```

Related keys: `blockedMarketplaces` (explicit denylist, enforced on add *and* on every
install/update/refresh — a marketplace added before the policy landed still can't fetch),
`enabledPlugins` (force-enable specific plugins), `allowManagedHooksOnly` (only managed
and force-enabled plugin hooks load).

Managed settings parse tolerantly: an invalid entry is stripped with a warning rather than
disabling the whole policy, so one typo cannot silently unlock the fleet. Run `/doctor` to
list what was stripped and from where.

## Two things that will bite you

### 1. `disableSideloadFlags` breaks the plugin authoring workflow

`disableSideloadFlags` (v2.1.193+) rejects `--plugin-dir`, `--plugin-url`, `--agents`, and
`--mcp-config`, closing the obvious hole in `strictKnownMarketplaces` — an engineer could
otherwise sideload anything for a single run.

But **`--plugin-dir` is exactly how plugins are developed and tested locally** (see
CONTRIBUTING.md). Turning it on fleet-wide means nobody can author a plugin.

**Recommendation:** don't enable it for the engineering group. If policy requires it
globally, carve out an exempted group for plugin authors and say so in CONTRIBUTING.md —
otherwise contributors hit a wall the docs don't explain.

Note it does *not* block `claude mcp add`, `.mcp.json` files, or the SDK's
`setMcpServers()`, so it is not a complete seal on its own.

### 2. Private-repo auto-updates fail quietly over HTTPS

The **background** refresh disables git credential helpers for its `git pull`. Against a
private repo over HTTPS the pull cannot authenticate, so Claude Code falls back to
re-cloning the whole marketplace — which can time out on a large repo. The result is
intermittently stale plugins.

Setting `GITHUB_TOKEN` in the environment does **not** fix this. Tokens only take effect
through a configured credential helper.

Fixes, best first:

- **Use SSH remotes.** Unaffected: a key in `ssh-agent` authenticates background pulls
  normally. GitHub `owner/repo` shorthand already clones over SSH by default.
- **Set `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1`.** Keeps the existing clone when
  a background pull fails instead of deleting and re-cloning, so plugins keep working from
  the last synced state.
- **Configure a credential helper** (`gh auth setup-git`) so the re-clone fallback can
  authenticate without prompting.
- **Scoped URL rewrite**, if the background pull itself must authenticate over HTTPS:
  ```bash
  git config --global \
    url."https://x-access-token:YOUR_TOKEN@github.com/<org>/dev-digest-harness-ai-marketplace".insteadOf \
    "https://github.com/<org>/dev-digest-harness-ai-marketplace"
  ```
  > Scope it to the repo or org path. A rewrite based on the bare hostname applies to
  > **every** fetch and push to github.com on that machine and overrides the engineer's
  > own credentials, including pushes to their own repositories.

## Rollout order

1. Move the repo into the org, private or internal.
2. Land the scaffold; enable branch protection (required checks + CODEOWNERS review).
3. Ship `extraKnownMarketplaces` to a pilot group — auto-injection only, no restrictions.
4. Land the first real plugin; confirm it installs and updates for the pilot.
5. Add `strictKnownMarketplaces` once the marketplace is the established path.
6. Consider `disableSideloadFlags` for non-engineering groups only.
