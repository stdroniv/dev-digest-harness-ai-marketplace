#!/usr/bin/env node
// Generates the catalog data the site/ frontend renders.
//
// Repository files are the only source of data for the catalog: this script reads the
// marketplace manifest, every plugin.json, README/CHANGELOG/COMPATIBILITY, and the
// frontmatter + body of every skill, agent, command, hook and MCP configuration. Nothing
// in site/public/ is hand-written, and nothing here reaches the network or the GitHub API.
//
// Output (all git-ignored, regenerated on every build):
//   site/public/index.json     every searchable component + marketplace metadata
//   site/public/releases.json  CHANGELOG entries, newest first — the What's new feed
//   site/public/stats.json     counters for the home page
//   site/public/bodies/        rendered-on-demand Markdown, one file per component
//
// Zero dependencies, no network.
//
// Usage:
//   node scripts/build-index.mjs            # write site/public/
//   node scripts/build-index.mjs --check    # build in memory, print a summary, write nothing

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const OUT = join(REPO, "site", "public");
const MANIFEST = join(REPO, ".claude-plugin", "marketplace.json");
const PLUGIN_ROOT = "plugins";
const CHECK = process.argv.includes("--check");

// Search hits need enough body text to match on, but index.json is downloaded in full on
// first paint. Full bodies live in bodies/ and load per page; the index carries a
// flattened prefix. Raise this only with a measured index.json size in hand.
const SEARCH_TEXT_LIMIT = 4000;

const warnings = [];
const warn = (msg) => warnings.push(msg);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const isFile = (p) => existsSync(p) && statSync(p).isFile();
const dirsIn = (p) =>
  isDir(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
const filesIn = (p, ext) =>
  isDir(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isFile() && d.name.endsWith(ext)).map((d) => d.name).sort() : [];
const read = (p) => readFileSync(p, "utf8");

function readJson(abs) {
  try {
    return JSON.parse(read(abs));
  } catch (e) {
    warn(`${relative(REPO, abs)}: invalid JSON (${e.message}) — skipped`);
    return null;
  }
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

/** Last commit that touched a path, as an ISO date. Falls back to file mtime so a build
 *  from a tarball or a shallow checkout still renders a date rather than a blank. */
function lastModified(absPath) {
  const iso = git(["log", "-1", "--format=%cI", "--", relative(REPO, absPath)]);
  if (iso) return iso;
  try {
    return statSync(absPath).mtime.toISOString();
  } catch {
    return null;
  }
}

/** Minimal frontmatter reader — mirrors scripts/lint-marketplace.mjs. Handles the three
 *  shapes plugin frontmatter actually uses: `key: value`, folded blocks (`key: >`), and
 *  one level of nesting, flattened to `parent.child` (`metadata.tags`). A YAML dependency
 *  is not worth it for that; anything deeper is not read, by design. */
function splitFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { data: {}, body: text };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { data: {}, body: text };

  const data = {};
  const clean = (v) => v.trim().replace(/^["']|["']$/g, "");
  let folding = null; // key currently collecting a folded block
  let parent = null; // key currently collecting nested children
  let buffer = [];
  const flush = () => {
    if (folding && buffer.length) data[folding] = buffer.join(" ").replace(/\s+/g, " ").trim();
    folding = null;
    buffer = [];
  };

  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue;
    const indented = /^\s/.test(line);
    const m = line.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (indented) {
      // A nested `key: value` under a bare parent; otherwise a folded-block line.
      if (parent && m && !folding) data[`${parent}.${m[1]}`] = clean(m[2]);
      else if (folding) buffer.push(line.trim());
      continue;
    }

    flush();
    parent = null;
    if (!m) continue;
    const [, k, v] = m;
    if ([">", "|", ">-", "|-"].includes(v)) folding = k;
    else if (v === "") parent = k; // a bare `key:` opens a nested block
    else data[k] = clean(v);
  }
  flush();
  return { data, body: lines.slice(end + 1).join("\n").trim() };
}

/** "Read, Grep, Glob" or "[Read, Grep]" -> ["Read", "Grep", "Glob"] */
const toList = (v) =>
  !v ? [] : String(v).replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);

/** Markdown -> readable plain text, for the search index and the release summaries. Never
 *  for rendering: the site renders the original Markdown through marked + DOMPurify.
 *
 *  Inline code keeps its content and words keep their hyphens: `ship-feature` and
 *  "read-only" are exactly what someone searches for, and dropping them turned summaries
 *  into punctuation soup ("dropped the rule slugs ( , )"). */
function plainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced blocks: never prose
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`([^`]*)`/g, "$1") // inline code: keep the code, drop the ticks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links: keep the text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s{0,3}>\s?/gm, "") // blockquote markers
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "") // list bullets
    .replace(/^\s{0,3}\|.*\|\s*$/gm, " ") // table rows: unreadable once flattened
    .replace(/^\s{0,3}[-*_]{3,}\s*$/gm, " ") // horizontal rules
    .replace(/[*_]{1,3}(?=\S)|(?<=\S)[*_]{1,3}/g, "") // emphasis, but not snake_case
    .replace(/\s+/g, " ")
    .trim();
}

const firstParagraph = (md) => {
  const p = plainText(md).slice(0, 400);
  return p.length === 400 ? `${p}…` : p;
};

// ---------------------------------------------------------------------------
// Marketplace metadata
// ---------------------------------------------------------------------------

if (!existsSync(MANIFEST)) {
  console.error(`missing ${relative(REPO, MANIFEST)} — nothing to index`);
  process.exit(1);
}
const manifest = readJson(MANIFEST);
if (!manifest) process.exit(1);

/** The repo slug, in priority order: GITHUB_REPOSITORY (set in Actions), then the origin
 *  remote. Both the "View on GitHub" links and the Pages base path derive from it, so a
 *  fork publishes correct links with no edit here. */
function repoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = git(["remote", "get-url", "origin"]);
  const m = url?.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (m) return m[1];
  warn("cannot determine the GitHub repo slug — 'View on GitHub' links will be omitted");
  return null;
}

const SLUG = repoSlug();
const BRANCH = process.env.GITHUB_REF_NAME || git(["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
const blobUrl = (relPath) => (SLUG ? `https://github.com/${SLUG}/blob/${BRANCH}/${relPath}` : null);

// The install command is derived, never typed: `@<marketplace name>` must match the
// manifest, and a copied-but-wrong command is the one bug that makes the whole catalog
// useless. See docs/SITE-SPEC.md.
const marketplaceName = manifest.name;
const installCommand = (pluginName) => `/plugin install ${pluginName}@${marketplaceName}`;

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------

const bodies = new Map(); // relative path under bodies/ -> markdown

/** Registers a Markdown body for a component and returns its public path. */
function addBody(id, markdown) {
  const path = `bodies/${id}.md`;
  bodies.set(path, markdown);
  return path;
}

// ---------------------------------------------------------------------------
// Component extraction
// ---------------------------------------------------------------------------

const components = [];

function push(c) {
  components.push({
    ...c,
    searchText: plainText(c._searchSource ?? "").slice(0, SEARCH_TEXT_LIMIT),
    _searchSource: undefined,
  });
}

/** skills/<name>/SKILL.md */
function readSkills(pluginName, pluginAbs) {
  const root = join(pluginAbs, "skills");
  const out = [];
  for (const name of dirsIn(root)) {
    const abs = join(root, name, "SKILL.md");
    if (!isFile(abs)) {
      warn(`plugins/${pluginName}/skills/${name}: no SKILL.md — skipped`);
      continue;
    }
    const src = read(abs);
    const { data, body } = splitFrontmatter(src);
    const rel = relative(REPO, abs);
    const id = `${pluginName}/skill/${name}`;
    out.push({
      id,
      type: "skill",
      name: data.name || name,
      description: data.description || "",
      keywords: toList(data["metadata.tags"] ?? data.tags),
      plugin: pluginName,
      // Skills are addressed by their owning plugin's namespace.
      invocation: `/${pluginName}:${name}`,
      tools: toList(data["allowed-tools"] ?? data.tools),
      model: data.model || null,
      updatedAt: lastModified(abs),
      sourcePath: rel,
      githubUrl: blobUrl(rel),
      bodyPath: addBody(id, body),
      _searchSource: `${data.description || ""}\n${body}`,
    });
  }
  return out;
}

/** agents/<name>.md */
function readAgents(pluginName, pluginAbs) {
  const root = join(pluginAbs, "agents");
  const out = [];
  for (const file of filesIn(root, ".md")) {
    const abs = join(root, file);
    const src = read(abs);
    const { data, body } = splitFrontmatter(src);
    const name = data.name || file.replace(/\.md$/, "");
    const rel = relative(REPO, abs);
    const id = `${pluginName}/agent/${name}`;
    out.push({
      id,
      type: "agent",
      name,
      description: data.description || "",
      keywords: [],
      plugin: pluginName,
      // Agents are dispatched by the model, not typed by the user.
      invocation: null,
      tools: toList(data.tools),
      model: data.model || null,
      updatedAt: lastModified(abs),
      sourcePath: rel,
      githubUrl: blobUrl(rel),
      bodyPath: addBody(id, body),
      _searchSource: `${data.description || ""}\n${body}`,
    });
  }
  return out;
}

/** commands/<name>.md */
function readCommands(pluginName, pluginAbs) {
  const root = join(pluginAbs, "commands");
  const out = [];
  for (const file of filesIn(root, ".md")) {
    const abs = join(root, file);
    const src = read(abs);
    const { data, body } = splitFrontmatter(src);
    const name = data.name || file.replace(/\.md$/, "");
    const rel = relative(REPO, abs);
    const id = `${pluginName}/command/${name}`;
    out.push({
      id,
      type: "command",
      name,
      description: data.description || firstParagraph(body),
      keywords: [],
      plugin: pluginName,
      invocation: `/${pluginName}:${name}`,
      tools: toList(data["allowed-tools"] ?? data.tools),
      model: data.model || null,
      updatedAt: lastModified(abs),
      sourcePath: rel,
      githubUrl: blobUrl(rel),
      bodyPath: addBody(id, body),
      _searchSource: `${data.description || ""}\n${body}`,
    });
  }
  return out;
}

/** hooks/hooks.json — one component per configured hook event. */
function readHooks(pluginName, pluginAbs) {
  const abs = join(pluginAbs, "hooks", "hooks.json");
  if (!isFile(abs)) return [];
  const cfg = readJson(abs);
  if (!cfg?.hooks || typeof cfg.hooks !== "object") return [];
  const rel = relative(REPO, abs);
  const out = [];

  for (const [event, matchers] of Object.entries(cfg.hooks)) {
    const list = Array.isArray(matchers) ? matchers : [];
    // A hook's real behaviour is the command it runs — the one thing a reader installing
    // it needs to see, since hooks execute unsandboxed. Surface every one.
    const runs = list.flatMap((m) => (Array.isArray(m.hooks) ? m.hooks : [])).map((h) => h.command).filter(Boolean);
    const matchesOn = list.map((m) => m.matcher).filter(Boolean);
    const id = `${pluginName}/hook/${event}`;
    const body = [
      `Runs on the \`${event}\` event.`,
      matchesOn.length ? `\nMatches: ${matchesOn.map((s) => `\`${s}\``).join(", ")}` : "",
      runs.length ? `\n\n## Commands\n\n${runs.map((c) => `\`\`\`sh\n${c}\n\`\`\``).join("\n\n")}` : "",
    ].join("");
    out.push({
      id,
      type: "hook",
      name: event,
      description: `${event} hook: runs ${runs.length} command${runs.length === 1 ? "" : "s"}${matchesOn.length ? ` matching ${matchesOn.join(", ")}` : ""}.`,
      keywords: ["hook", event],
      plugin: pluginName,
      invocation: null,
      tools: [],
      model: null,
      updatedAt: lastModified(abs),
      sourcePath: rel,
      githubUrl: blobUrl(rel),
      bodyPath: addBody(id, body),
      _searchSource: `${event} hook ${matchesOn.join(" ")} ${runs.join(" ")}`,
    });
  }
  return out;
}

/** .mcp.json — one component per configured MCP server. */
function readMcp(pluginName, pluginAbs) {
  const abs = join(pluginAbs, ".mcp.json");
  if (!isFile(abs)) return [];
  const cfg = readJson(abs);
  const servers = cfg?.mcpServers;
  if (!servers || typeof servers !== "object") return [];
  const rel = relative(REPO, abs);

  return Object.entries(servers).map(([name, s]) => {
    const id = `${pluginName}/mcp/${name}`;
    const transport = s.type || (s.url ? "http" : "stdio");
    const target = s.url || [s.command, ...(s.args ?? [])].filter(Boolean).join(" ");
    // Values are never read — only the names of the slots. A catalog must not become a
    // place where a credential can leak, however a plugin's config is written.
    const envKeys = Object.keys(s.env ?? {});
    const body = [
      `MCP server \`${name}\` (${transport}).`,
      target ? `\n\n\`\`\`sh\n${target}\n\`\`\`` : "",
      envKeys.length ? `\n\nEnvironment slots: ${envKeys.map((k) => `\`${k}\``).join(", ")}` : "",
    ].join("");
    return {
      id,
      type: "mcp",
      name,
      description: `MCP server over ${transport}${target ? `: ${target}` : ""}.`,
      keywords: ["mcp", transport],
      plugin: pluginName,
      invocation: null,
      tools: [],
      model: null,
      updatedAt: lastModified(abs),
      sourcePath: rel,
      githubUrl: blobUrl(rel),
      bodyPath: addBody(id, body),
      _searchSource: `mcp ${name} ${transport} ${target} ${envKeys.join(" ")}`,
    };
  });
}

// ---------------------------------------------------------------------------
// CHANGELOG -> releases
// ---------------------------------------------------------------------------

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** Parses `## <version>` sections, newest first as written. A trailing date in the
 *  heading ("## 1.2.0 — 2026-07-16") is used when present; the repo's own format has no
 *  date, so the plugin's last-commit date is the fallback ordering key. */
function readReleases(pluginName, pluginAbs, fallbackDate) {
  const abs = join(pluginAbs, "CHANGELOG.md");
  if (!isFile(abs)) return [];
  const lines = read(abs).split(/\r?\n/);
  const out = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(?:\[)?v?([0-9][^\s\]]*)(?:\])?\s*(?:[-–—(:]\s*(.+?)\s*\)?)?$/);
    if (m && SEMVER.test(m[1])) {
      if (current) out.push(current);
      const date = m[2]?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
      current = { plugin: pluginName, version: m[1], date, body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) out.push(current);

  return out.map((r) => ({
    plugin: pluginName,
    version: r.version,
    date: r.date ?? fallbackDate,
    dateIsExact: Boolean(r.date),
    body: r.body.join("\n").trim(),
    summary: firstParagraph(r.body.join("\n")),
  }));
}

// ---------------------------------------------------------------------------
// Walk the registry
// ---------------------------------------------------------------------------

const entries = Array.isArray(manifest.plugins) ? manifest.plugins : [];
const releases = [];

for (const entry of entries) {
  const pluginAbs = join(REPO, PLUGIN_ROOT, entry.name);
  if (!isDir(pluginAbs)) {
    warn(`${entry.name}: registered in the manifest but plugins/${entry.name}/ does not exist — skipped`);
    continue;
  }
  const pj = readJson(join(pluginAbs, ".claude-plugin", "plugin.json"));
  if (!pj) continue;

  const skills = readSkills(entry.name, pluginAbs);
  const agents = readAgents(entry.name, pluginAbs);
  const commands = readCommands(entry.name, pluginAbs);
  const hooks = readHooks(entry.name, pluginAbs);
  const mcp = readMcp(entry.name, pluginAbs);
  for (const c of [...skills, ...agents, ...commands, ...hooks, ...mcp]) push(c);

  const readmeAbs = join(pluginAbs, "README.md");
  const readme = isFile(readmeAbs) ? read(readmeAbs) : "";
  if (!readme) warn(`${entry.name}: no README.md — its detail page will have no body`);

  const compatAbs = join(pluginAbs, "COMPATIBILITY.md");
  const compatibility = isFile(compatAbs) ? read(compatAbs) : null;

  const updatedAt = lastModified(pluginAbs);
  releases.push(...readReleases(entry.name, pluginAbs, updatedAt?.slice(0, 10) ?? null));

  const id = `${entry.name}/plugin/${entry.name}`;
  push({
    id,
    type: "plugin",
    name: entry.name,
    displayName: pj.displayName || entry.name,
    // The manifest description is what sells the plugin in /plugin; plugin.json is the
    // fuller one. Prefer the fuller text, fall back to the entry.
    description: pj.description || entry.description || "",
    keywords: Array.isArray(pj.keywords) ? pj.keywords : [],
    plugin: entry.name,
    category: entry.category || null,
    version: pj.version || null,
    license: pj.license || null,
    author: pj.author?.name || manifest.owner?.name || null,
    invocation: null,
    tools: [],
    model: null,
    installCommand: installCommand(entry.name),
    dependencies: Array.isArray(pj.dependencies)
      ? pj.dependencies.map((d) => (typeof d === "string" ? { name: d } : d))
      : [],
    contents: {
      skills: skills.map((s) => s.id),
      agents: agents.map((a) => a.id),
      commands: commands.map((c) => c.id),
      hooks: hooks.map((h) => h.id),
      mcp: mcp.map((m) => m.id),
    },
    compatibilityPath: compatibility ? addBody(`${entry.name}/compatibility`, compatibility) : null,
    updatedAt,
    sourcePath: `${PLUGIN_ROOT}/${entry.name}`,
    githubUrl: SLUG ? `https://github.com/${SLUG}/tree/${BRANCH}/${PLUGIN_ROOT}/${entry.name}` : null,
    bodyPath: addBody(id, readme),
    _searchSource: `${pj.description || ""}\n${(pj.keywords ?? []).join(" ")}\n${readme}`,
  });
}

// Reverse dependencies are a read of the whole registry, so they are computed once here
// rather than by every page that wants to answer "what pulls this in?".
const byName = new Map(components.filter((c) => c.type === "plugin").map((c) => [c.name, c]));
for (const p of byName.values()) {
  p.dependents = [...byName.values()]
    .filter((o) => o.dependencies.some((d) => d.name === p.name))
    .map((o) => o.name);
  for (const d of p.dependencies) {
    // A dependency outside this marketplace is legitimate (it carries a `marketplace`
    // field); one that is merely missing is a registry bug the linter also catches.
    d.resolved = d.marketplace ? false : byName.has(d.name);
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const count = (t) => components.filter((c) => c.type === t).length;

releases.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.plugin.localeCompare(b.plugin));

const index = {
  marketplace: {
    name: marketplaceName,
    description: manifest.description || "",
    owner: manifest.owner?.name || null,
    repo: SLUG,
    repoUrl: SLUG ? `https://github.com/${SLUG}` : null,
    branch: BRANCH,
    addCommand: SLUG ? `/plugin marketplace add ${SLUG}` : null,
  },
  components,
};

const stats = {
  plugins: count("plugin"),
  skills: count("skill"),
  agents: count("agent"),
  commands: count("command"),
  hooks: count("hook"),
  mcp: count("mcp"),
  // The newest release date across the catalog — the home page's "last updated".
  updatedAt: releases[0]?.date ?? null,
};

if (CHECK) {
  console.log(JSON.stringify({ stats, releases: releases.length, bodies: bodies.size }, null, 2));
} else {
  // Stale bodies from a deleted component would otherwise be served forever: the
  // directory is generated output, so it is rebuilt from scratch, never merged into.
  rmSync(join(OUT, "bodies"), { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  writeFileSync(join(OUT, "index.json"), JSON.stringify(index));
  writeFileSync(join(OUT, "releases.json"), JSON.stringify(releases));
  writeFileSync(join(OUT, "stats.json"), JSON.stringify(stats));
  for (const [path, md] of bodies) {
    const abs = join(OUT, path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, md);
  }
}

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`;
console.log(
  `${CHECK ? "checked" : "wrote"} ${relative(REPO, OUT)}: ` +
    `${stats.plugins} plugins, ${stats.skills} skills, ${stats.agents} agents, ` +
    `${stats.commands} commands, ${stats.hooks} hooks, ${stats.mcp} MCP servers; ` +
    `${releases.length} releases; index.json ${kb(JSON.stringify(index))}`,
);
for (const w of warnings) console.log(`warning: ${w}`);

// A plugin registered with nothing to show means the catalog silently lost a page; the
// linter guarantees this cannot happen, so if it does, the reader here is wrong.
if (stats.plugins === 0) {
  console.error("no plugins indexed — the catalog would publish empty");
  process.exit(1);
}
