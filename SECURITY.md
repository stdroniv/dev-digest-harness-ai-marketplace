# Security

## The trust model

**Plugins in this marketplace run fully trusted, unsandboxed code on every installer's
machine.** There is no isolation layer. Specifically:

- **Skills** run shell commands with the developer's full privileges.
- **MCP servers** download, install, and execute arbitrary binaries.
- **Hooks** intercept every tool call, and can read or rewrite what Claude does.
- **`bin/`** entries are added to `PATH` for the Bash tool while the plugin is enabled.
- **`settings.json`** can change how Claude Code behaves by default.

Installing a plugin from here is equivalent to running a colleague's script on your
laptop with no review. Treat it that way.

The defense is **the allowlist plus human review before merge**. There is no scanner that
makes this safe, and none is planned — automated screening cannot tell a legitimate
`curl | sh` in a setup script from a malicious one.

## Review requirements

Ordinary plugins (skills and agents only) are reviewed by their owning team via CODEOWNERS.

**These require platform engineering *and* security review, regardless of CODEOWNERS:**

| Surface | Why |
|---|---|
| `hooks/hooks.json` | Intercepts every tool call; can exfiltrate or silently alter behavior |
| `.mcp.json` | Installs and runs third-party binaries, often with network and credential access |
| `bin/` | Injects executables onto `PATH` for the Bash tool |
| `settings.json` | Changes default agent behavior for everyone who enables the plugin |

Reviewers should confirm, at minimum:

- Every network endpoint and installed package is named, pinned, and expected.
- Nothing reads credentials, SSH keys, or environment secrets beyond its stated purpose.
- No `curl | sh`-style fetch-and-execute from an unpinned source.
- Hooks act only on the tool calls they claim to.

## Secrets

**Never commit secrets, and never ask users to hand-edit `settings.json`.**

Declare them in `plugin.json` as `userConfig` with `"sensitive": true`. Claude Code
prompts the user on enable and stores the value for them:

```jsonc
{
  "userConfig": {
    "api_token": {
      "type": "string",
      "title": "API token",
      "description": "Token for the internal API",
      "sensitive": true
    }
  }
}
```

## Marketplace integrity

- The repository must be **private or internal**. GitHub-synced organization marketplaces
  do not permit public repos, and a public marketplace would let anyone see — and file PRs
  against — our internal tooling.
- `main` is protected: CODEOWNERS review plus the CI checks are required.
- Admins should restrict which marketplaces engineers can add at all
  (`strictKnownMarketplaces`). See [docs/admin-rollout.md](docs/admin-rollout.md).

## Reporting

Found something wrong with a plugin here? Contact platform engineering directly rather
than opening a public issue. If it is already installed org-wide, say so — admins can set
a plugin to "Not available" to stop further installs while it is fixed.
