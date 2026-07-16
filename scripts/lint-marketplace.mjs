#!/usr/bin/env node
// Structural linter for the dev-digest-harness plugin marketplace.
//
// Plugins here are often written and modified by coding agents. Structural checks that
// feel pedantic to a human are the main thing keeping the registry consistent, so this
// runs as a required CI check.
//
// Zero dependencies, no network. Collects every error before exiting so a contributor
// (human or agent) can fix the whole batch in one pass.
//
// Usage:
//   node scripts/lint-marketplace.mjs                     # lint the repo
//   node scripts/lint-marketplace.mjs --fixture <dir>     # lint one plugin dir (self-test)
//
// Env:
//   BASE_REF   git ref to diff against for the version-bump check (default: origin/main)
//   CI         when set, an unresolvable BASE_REF is fatal rather than skipped

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const MANIFEST = ".claude-plugin/marketplace.json";
const PLUGIN_ROOT = "plugins";
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

// Reserved for official Anthropic use; re-checked by Claude Code on every marketplace
// load, so an offending name breaks the marketplace for everyone, not just at add time.
const RESERVED = new Set([
  "claude-code-marketplace", "claude-code-plugins", "claude-plugins-official",
  "claude-plugins-community", "claude-community", "anthropic-marketplace",
  "anthropic-plugins", "agent-skills", "anthropic-agent-skills",
  "knowledge-work-plugins", "life-sciences", "claude-for-legal",
  "claude-for-financial-services", "financial-services-plugins",
  "first-party-plugins", "healthcare",
]);

// Marketplace entry keys we allow. Mirrors `claude plugin validate --strict`, minus
// `version` which is forbidden outright (see checkEntry).
const ENTRY_KEYS = new Set([
  "name", "source", "displayName", "description", "author", "homepage",
  "repository", "license", "keywords", "category", "tags", "strict",
  "relevance", "defaultEnabled", "dependencies",
]);

// Only plugin.json belongs in .claude-plugin/. These live at the plugin root; putting
// them under .claude-plugin/ is the mistake Anthropic's docs call out as #1.
const ROOT_ONLY = ["skills", "agents", "commands", "hooks"];

// Machine-specific paths in an executable surface work for the author and fail for
// everyone else. ${CLAUDE_PLUGIN_ROOT} is the supported way to reference plugin files.
const ABSOLUTE_PATH = /(?:^|["'\s=:(])(\/(?:Users|home|Volumes|opt|usr\/local)\/|[A-Za-z]:\\{1,2})/;

// Files where an absolute path actually executes. Prose is excluded on purpose: docs
// legitimately mention paths like /etc/claude-code/managed-settings.json.
const EXECUTABLE_SURFACES = [".mcp.json", ".lsp.json", "settings.json", "hooks/hooks.json", "monitors/monitors.json"];

const errors = [];
const notes = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const dirs = (p) =>
  existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

function readJson(abs, rel) {
  try {
    return JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    err(rel, `invalid JSON: ${e.message}`);
    return null;
  }
}

function git(args) {
  return execFileSync("git", args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** True when `a` is strictly greater than `b`. A downgrade must fail: it re-serves a
 *  cached older tree just as silently as a missing bump. */
function semverGt(a, b) {
  const parse = (v) => v.split("-")[0].split(".").map(Number);
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] > y[i];
  }
  // Equal release triples: a prerelease is older than its release.
  const pre = (v) => v.includes("-");
  return pre(b) && !pre(a);
}

/** Minimal frontmatter reader. A YAML dependency is not worth it for `key: value`. */
function frontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const out = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Plugin structure (also used by --fixture)
// ---------------------------------------------------------------------------

// Set from the manifest before plugins are checked. Null in --fixture mode, where a
// single directory is linted with no registry to resolve dependencies against.
let registryNames = null;
let allowedMarketplaces = null;

/** Dependencies resolve within this marketplace unless `marketplace` is set, and a
 *  cross-marketplace dependency is blocked at install unless the root marketplace
 *  allowlists it. Both failures are install-time, so catch them here instead. */
function checkDependencies(p, pj) {
  if (!("dependencies" in p)) return;
  if (!Array.isArray(p.dependencies)) {
    err(pj, '"dependencies" must be an array');
    return;
  }
  for (const [i, d] of p.dependencies.entries()) {
    const at = `${pj} dependencies[${i}]`;
    const dep = typeof d === "string" ? { name: d } : d;
    if (typeof d !== "string" && (typeof d !== "object" || d === null)) {
      err(at, 'must be a plugin name or an object with { name, version?, marketplace? }');
      continue;
    }
    if (!dep.name) {
      err(at, 'missing "name"');
      continue;
    }
    for (const k of Object.keys(dep)) {
      if (!["name", "version", "marketplace"].includes(k)) err(at, `unknown field "${k}"`);
    }
    if (dep.name === p.name) err(at, "a plugin cannot depend on itself");

    if (dep.marketplace) {
      if (allowedMarketplaces && !allowedMarketplaces.has(dep.marketplace)) {
        err(at, `depends on "${dep.marketplace}" — add it to allowCrossMarketplaceDependenciesOn in ${MANIFEST}, or install fails with a cross-marketplace error`);
      }
    } else if (registryNames && !registryNames.has(dep.name)) {
      err(at, `"${dep.name}" is not in this marketplace — register it, or set "marketplace" to name where it lives`);
    }

    // Constraints resolve against git tags named <plugin>--v<version>. A constraint on
    // an untagged plugin disables the dependent with no-matching-tag at install.
    if (dep.version && !/^[~^=<>]*\s*\d+(\.\d+)*(\.\d+)?(-[0-9A-Za-z.-]+)?(\s*\|\|\s*.+)?$/.test(dep.version.trim())) {
      err(at, `version "${dep.version}" is not a recognizable semver range (e.g. ~2.1.0, ^2.0, >=1.4, =2.1.0)`);
    }
    if (dep.version && !dep.marketplace) {
      notes.push(`${p.name} constrains "${dep.name}" to ${dep.version}; that only resolves if ${dep.name} releases are tagged (claude plugin tag --push). See docs/RELEASES.md.`);
    }
  }
}

function checkPlugin(abs, rel, expectedName) {
  const meta = join(abs, ".claude-plugin");

  if (!existsSync(join(meta, "plugin.json"))) {
    err(rel, "missing .claude-plugin/plugin.json");
    return null;
  }

  // #1 documented mistake, and exactly what an agent gets wrong.
  for (const d of ROOT_ONLY) {
    if (isDir(join(meta, d))) {
      err(`${rel}/.claude-plugin/${d}`, `${d}/ must live at the plugin root (${rel}/${d}/), not inside .claude-plugin/`);
    }
  }
  for (const f of readdirSync(meta)) {
    if (f !== "plugin.json") err(`${rel}/.claude-plugin/${f}`, "only plugin.json belongs in .claude-plugin/");
  }

  const p = readJson(join(meta, "plugin.json"), `${rel}/.claude-plugin/plugin.json`);
  if (!p) return null;
  const pj = `${rel}/.claude-plugin/plugin.json`;

  for (const k of ["name", "description", "version"]) {
    if (!p[k]) err(pj, `missing required field "${k}"`);
  }
  if (p.version && !SEMVER.test(p.version)) err(pj, `version "${p.version}" is not semver (MAJOR.MINOR.PATCH)`);
  if (p.name && !KEBAB.test(p.name)) err(pj, `name "${p.name}" must be kebab-case`);
  if (expectedName && p.name && p.name !== expectedName) {
    err(pj, `name "${p.name}" must match its directory "${expectedName}" (plugin names are immutable)`);
  }

  // A plugin whose manifest is only a dependencies array is a valid curated bundle:
  // installing it pulls in the whole set. Such a plugin ships no surfaces of its own.
  const isBundle = Array.isArray(p.dependencies) && p.dependencies.length > 0;
  const surfaces = ["skills", "agents", "commands"].filter((d) => isDir(join(abs, d)));
  if (surfaces.length === 0 && !isBundle) {
    err(rel, "plugin has no skills/, agents/, or commands/ — it does nothing (a bundle plugin needs a non-empty dependencies array)");
  }

  // Every release needs a readable history; pinned semver is only useful if someone
  // can tell what changed between two versions.
  if (!existsSync(join(abs, "CHANGELOG.md"))) {
    err(rel, "missing CHANGELOG.md — every version bump must record what changed (see docs/RELEASES.md)");
  } else if (p.version && !readFileSync(join(abs, "CHANGELOG.md"), "utf8").includes(p.version)) {
    err(`${rel}/CHANGELOG.md`, `no entry for the current version ${p.version}`);
  }

  checkDependencies(p, pj);

  // Absolute paths: fine on the author's laptop, broken for every installer.
  for (const f of EXECUTABLE_SURFACES) {
    const abs_f = join(abs, f);
    if (!existsSync(abs_f)) continue;
    for (const [i, line] of readFileSync(abs_f, "utf8").split(/\r?\n/).entries()) {
      if (ABSOLUTE_PATH.test(line)) {
        err(`${rel}/${f}:${i + 1}`, `absolute path — use \${CLAUDE_PLUGIN_ROOT} so it resolves on every machine: ${line.trim()}`);
      }
    }
  }

  const skillsDir = join(abs, "skills");
  if (isDir(skillsDir)) {
    for (const f of readdirSync(skillsDir, { withFileTypes: true })) {
      if (f.isFile() && f.name.endsWith(".md")) {
        err(`${rel}/skills/${f.name}`, "skills must be directories containing SKILL.md, not loose .md files");
      }
    }
    for (const name of dirs(skillsDir)) {
      const sr = `${rel}/skills/${name}`;
      if (!KEBAB.test(name)) err(sr, `skill directory "${name}" must be kebab-case`);
      const md = join(skillsDir, name, "SKILL.md");
      if (!existsSync(md)) {
        err(sr, "missing SKILL.md");
        continue;
      }
      const fm = frontmatter(readFileSync(md, "utf8"));
      if (!fm) {
        err(`${sr}/SKILL.md`, "missing YAML frontmatter (must open with ---)");
        continue;
      }
      if (fm.name && fm.name !== name) err(`${sr}/SKILL.md`, `frontmatter name "${fm.name}" must match directory "${name}"`);
      // A vague description means the model never invokes the skill — a silent failure
      // indistinguishable from the skill not existing.
      if (!fm.description) err(`${sr}/SKILL.md`, 'missing "description" — Claude uses it to decide when to invoke the skill');
      else if (fm.description.length < 20) err(`${sr}/SKILL.md`, `description is too vague (${fm.description.length} chars); say when to use the skill`);
    }
  }
  return p;
}

// ---------------------------------------------------------------------------
// --fixture mode: run the structural checks against one directory
// ---------------------------------------------------------------------------

const fixtureIdx = process.argv.indexOf("--fixture");
if (fixtureIdx !== -1) {
  const rel = process.argv[fixtureIdx + 1];
  if (!rel) {
    console.error("--fixture requires a directory");
    process.exit(2);
  }
  const abs = resolve(REPO, rel);
  if (!isDir(abs)) {
    console.error(`${rel}: not a directory`);
    process.exit(2);
  }
  checkPlugin(abs, rel, abs.split("/").pop());
  report();
}

// ---------------------------------------------------------------------------
// A. Manifest integrity
// ---------------------------------------------------------------------------

const mAbs = join(REPO, MANIFEST);
if (!existsSync(mAbs)) {
  err(MANIFEST, "missing marketplace manifest");
  report();
}
const m = readJson(mAbs, MANIFEST);
if (!m || typeof m !== "object" || Array.isArray(m)) {
  err(MANIFEST, "manifest must be a JSON object");
  report();
}

if (!m.name) err(MANIFEST, 'missing required field "name"');
else {
  if (!KEBAB.test(m.name)) err(MANIFEST, `name "${m.name}" must be kebab-case`);
  if (RESERVED.has(m.name)) err(MANIFEST, `name "${m.name}" is reserved for Anthropic and will be rejected on every load`);
  if (/^(anthropic|claude)-/.test(m.name)) err(MANIFEST, `name "${m.name}" impersonates an official Anthropic marketplace`);
}
if (!m.owner || typeof m.owner !== "object" || !m.owner.name) {
  err(MANIFEST, 'missing "owner" object with a "name"');
}
if (m.metadata?.pluginRoot !== "./plugins") {
  err(MANIFEST, `metadata.pluginRoot must be "./plugins" (found ${JSON.stringify(m.metadata?.pluginRoot)})`);
}

const entries = Array.isArray(m.plugins) ? m.plugins : null;
if (!entries) err(MANIFEST, '"plugins" must be an array (use [] when empty)');

// ---------------------------------------------------------------------------
// A/B. Entries and registry <-> filesystem bijection
// ---------------------------------------------------------------------------

const named = new Map();
for (const [i, e] of (entries ?? []).entries()) {
  const at = `${MANIFEST} plugins[${i}]`;
  if (!e || typeof e !== "object") {
    err(at, "entry must be an object");
    continue;
  }
  if (!e.name) {
    err(at, 'missing "name"');
    continue;
  }
  if (!KEBAB.test(e.name)) err(at, `name "${e.name}" must be kebab-case`);
  if (named.has(e.name)) err(at, `duplicate plugin name "${e.name}"`);
  named.set(e.name, e);

  // plugin.json silently wins over a marketplace version, masking whatever is set here.
  if ("version" in e) {
    err(at, `remove "version" — it is set in plugins/${e.name}/.claude-plugin/plugin.json, which silently overrides it`);
  }
  if (!("source" in e)) err(at, 'missing "source"');
  else if (typeof e.source !== "string") err(at, "source must be a string (this marketplace hosts plugins inline)");
  else if (e.source !== e.name) {
    err(at, `source must be the bare plugin name "${e.name}" (metadata.pluginRoot prepends ./plugins), found "${e.source}"`);
  }
  for (const k of Object.keys(e)) {
    if (!ENTRY_KEYS.has(k)) err(at, `unknown field "${k}"`);
  }
}

const onDisk = dirs(join(REPO, PLUGIN_ROOT));
for (const name of named.keys()) {
  if (!onDisk.includes(name)) err(MANIFEST, `"${name}" is registered but plugins/${name}/ does not exist`);
}
for (const name of onDisk) {
  if (!named.has(name)) err(`plugins/${name}`, `directory exists but is not registered in ${MANIFEST}`);
}

// ---------------------------------------------------------------------------
// C/D. Plugin structure + E. CODEOWNERS
// ---------------------------------------------------------------------------

const coPath = join(REPO, ".github/CODEOWNERS");
const codeowners = existsSync(coPath) ? readFileSync(coPath, "utf8") : (err(".github/CODEOWNERS", "missing"), "");

registryNames = new Set(named.keys());
allowedMarketplaces = new Set(
  Array.isArray(m.allowCrossMarketplaceDependenciesOn) ? m.allowCrossMarketplaceDependenciesOn : [],
);

for (const name of onDisk) {
  checkPlugin(join(REPO, PLUGIN_ROOT, name), `plugins/${name}`, name);

  const owned = codeowners
    .split(/\r?\n/)
    .some((l) => !l.trim().startsWith("#") && l.trim().startsWith(`/plugins/${name}/`) && /@\S+/.test(l));
  if (!owned) err(".github/CODEOWNERS", `no owner for /plugins/${name}/ — every plugin needs an owning team`);
}

// ---------------------------------------------------------------------------
// F. Version bump — the check this repo exists for
// ---------------------------------------------------------------------------

const base = process.env.BASE_REF || "origin/main";
let mergeBase = null;
try {
  git(["rev-parse", "--verify", `${base}^{commit}`]);
  mergeBase = git(["merge-base", base, "HEAD"]);
} catch {
  // A silent skip here defeats the whole rule, and a shallow checkout is the likeliest
  // cause in CI. Fail loudly there; stay quiet for a fresh local clone with no history.
  const msg = `cannot resolve BASE_REF "${base}" — the version-bump check cannot run (in CI, use actions/checkout with fetch-depth: 0)`;
  if (process.env.CI) err("git", msg);
  else notes.push(`skipped version-bump check: ${msg}`);
}

if (mergeBase) {
  const changed = git(["diff", "--name-only", mergeBase, "HEAD"]).split("\n").filter(Boolean);
  const touched = new Set();
  for (const f of changed) {
    const m2 = f.match(/^plugins\/([^/]+)\//);
    if (m2) touched.add(m2[1]);
  }

  const renames = m.renames && typeof m.renames === "object" ? m.renames : {};

  for (const name of touched) {
    const pj = `plugins/${name}/.claude-plugin/plugin.json`;

    let before = null;
    try {
      before = JSON.parse(git(["show", `${mergeBase}:${pj}`]));
    } catch {
      before = null; // absent at base => new plugin
    }

    if (!existsSync(join(REPO, PLUGIN_ROOT, name))) {
      // Deleted. Names are immutable, so installed users need a renames entry to migrate:
      // either to the new name, or to null if it is gone for good.
      if (!(name in renames)) {
        err(MANIFEST, `plugin "${name}" was removed — add renames: { "${name}": null } (or the new name) so existing installs migrate`);
      }
      notes.push(`"${name}" was removed — platform engineering must review this.`);
      continue;
    }

    const after = readJson(join(REPO, pj), pj);
    if (!after) continue;

    if (!before) {
      if (!after.version) err(pj, 'new plugin needs a "version" (start at 0.1.0)');
      continue;
    }
    if (!after.version || !before.version) continue; // already reported by checkPlugin

    if (!semverGt(after.version, before.version)) {
      err(
        pj,
        after.version === before.version
          ? `plugins/${name}/ changed but version is still ${after.version} — Claude Code caches by version string, so merging this ships nothing to users. Bump it.`
          : `version went backwards (${before.version} -> ${after.version}) — this re-serves a stale cached copy. Bump instead.`,
      );
    }
  }

  // A rename is a delete + add; without a renames entry, existing installs simply break.
  for (const name of named.keys()) {
    const wasPresent = (() => {
      try {
        git(["show", `${mergeBase}:plugins/${name}/.claude-plugin/plugin.json`]);
        return true;
      } catch {
        return false;
      }
    })();
    if (!wasPresent && Object.values(renames).includes(name) === false) {
      const removed = [...touched].filter((t) => !existsSync(join(REPO, PLUGIN_ROOT, t)));
      if (removed.length > 0) {
        notes.push(`"${name}" is new while ${removed.map((r) => `"${r}"`).join(", ")} was removed — if this is a rename, add renames: { "${removed[0]}": "${name}" }.`);
      }
    }
  }
}

report();

function report() {
  for (const n of notes) console.log(`note: ${n}`);
  if (errors.length === 0) process.exit(0);
  console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"} found:\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error("\nSee CONTRIBUTING.md for the plugin layout rules.");
  process.exit(1);
}
