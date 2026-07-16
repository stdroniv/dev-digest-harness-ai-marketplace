# Changelog

All notable changes to this plugin. Newest first. Every version bump needs an entry —
the version string is what users receive, so this is the only place they can see what
they got. See [docs/RELEASES.md](../../docs/RELEASES.md).

## 1.0.0

- Initial release. Extracted from the DevDigest harness.
- Adds nine technical skills whose guidance was already free of project-specific
  references: `drizzle-orm-patterns`, `fastify-best-practices`, `next-best-practices`,
  `postgresql-table-design`, `react-best-practices`, `react-testing-library`,
  `typescript-expert`, `zod`, `mermaid-diagram`.
- Dropped each skill's `evals/` directory (82 files). Those are author-time grading
  harnesses — no `SKILL.md` reads them — and their fixtures were written to look like
  modules of the product the skills were extracted from. Shipping them would have handed
  every installer another team's domain code as reference material.
- Known gap: the opinionated architecture skills (`backend-onion-architecture`,
  `ui-frontend-architecture`, `security`, `client-server-communication`) are **not**
  included — each is written against one repository's layout and needs generalizing
  before it can ship. See the README.
