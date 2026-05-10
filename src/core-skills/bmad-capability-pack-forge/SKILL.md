---
name: bmad-capability-pack-forge
description: 'Generates draft BMAD capability-pack artifacts from local evidence files. Use when you need to turn evidence refs and optional Workspace Capability Requests into reviewable capability request, readiness, customization, and Codex task drafts.'
---

# Capability Pack Forge

Capability Pack Forge is a source artifact generator for BMAD capability packs.
It consumes local evidence files and emits draft artifacts for human review.

It is not a Workspace command, runtime, verifier, installer, grant source,
scheduler, live adapter, or `_bmad/custom` authority.

## Operator Model

Forge consumes evidence files, emits draft capability-pack artifacts, then a
human reviews the output and chooses the next BMAD workflow.

Use Forge when:

- Local evidence refs should become a repeatable BMAD capability pack.
- A Capability Request needs companion readiness, customization, and Codex task
  drafts.
- Optional Context7, Graphify, PostgreSQL, Docker, Git, Codex, Outlook, or
  Desktop Commander/Zsh Shell MCP observations need to be referenced as
  advisory evidence without becoming live integrations.

## Command

Current JSON command:

```bash
node {project-root}/tools/capability-pack-forge.js --input <forge-request.json> --output <dir>
```

The input must be local JSON. Evidence paths inside the request must be local
relative paths under the request file directory.

`forge-request.json` remains the canonical input. Forge v1 must not parse TOML
input.

Compiler commands:

```bash
node {project-root}/tools/capability-pack-forge.js migrate --config .capability-forge/forge.toml
node {project-root}/tools/capability-pack-forge.js ingest --config .capability-forge/forge.toml
node {project-root}/tools/capability-pack-forge.js search --config .capability-forge/forge.toml --query "<query>"
node {project-root}/tools/capability-pack-forge.js draft --config .capability-forge/forge.toml --slug <slug> --title "<title>"
node {project-root}/tools/capability-pack-forge.js validate --config .capability-forge/forge.toml --slug <slug>
node {project-root}/tools/capability-pack-forge.js export-bmad --config .capability-forge/forge.toml --slug <slug>
node {project-root}/tools/capability-pack-forge.js promote --config .capability-forge/forge.toml --slug <slug> --target <runtime-root/pack> --approved
```

All compiler commands require `.capability-forge/forge.toml` with
`workspace.write_mode = "draft_only"`.

## Inputs

- `evidenceRefs[]` with local paths and `sourceType` such as `context7`,
  `local_docs`, `manual_contract`, `repo_template`, or `other`.
- Existing Workspace Capability Request JSON for `packMode: "verifier-ready"`.
- Optional candidate/draft context for `packMode: "draft-authoring"`.
- Optional target customization surface name.
- Acceptance criteria.
- Optional `capabilityDomain: "postgresql"` when the generated pack is about
  PostgreSQL as a capability domain.
- Optional `draftAuthoring: "toml"` when the generated pack should explicitly
  mark TOML as a human authoring draft surface.
- Optional `agenticSearch` metadata for `Agentic Search for Context
  Engineering`. It must describe `file-search`, `skill-loading`,
  `database-query`, `web-search`, `memory`, and `shell` with tool purpose,
  trigger condition, negative trigger condition, parameter complexity, authority
  boundary, and evidence boundary.

`context7EvidenceRef` is a deprecated compatibility alias that normalizes into
`evidenceRefs[]`. Context7 is an evidence source, not a Forge requirement.

## Outputs

Generated artifacts:

- `manifest.json`
- `capability-pack.json`
- `capability-request.json`
- `operator-evidence-template.json`
- `customization-draft.toml`
- `skill-outline.md`
- `readiness-checklist.md`
- `codex-task-packet.md`

The Codex task packet is an instruction draft only. The customization draft is
inactive until routed through `skill:bmad-customize`.

When `agenticSearch` is present, Forge includes the context tool taxonomy in
`capability-pack.json`, `operator-evidence-template.json`,
`skill-outline.md`, `readiness-checklist.md`, and `codex-task-packet.md`. This
is planning guidance only; it does not call live Agentic Search tools.

When `draftAuthoring: "toml"` is present, generated TOML is still an authoring
artifact routed through `bmad-customize`, not verifier authority. When
`capabilityDomain: "postgresql"` is present, PostgreSQL is a generated pack
domain only, never Forge infrastructure.

In the compiler path, PostgreSQL is state store only: evidence, provenance,
review events, artifacts, migration records, and promotion records. The
reviewable `pack-draft.toml` is generated from that state and must be matched
against database-backed compiler state before export or promotion. If
`pack-draft.toml` references stale evidence, `validate`, `export-bmad`, and
`promote` fail until the operator re-runs `ingest` and regenerates the draft.
PostgreSQL MCP remains advisory/operator evidence only; Forge infrastructure
uses direct `pg` code.
Exported BMAD review packets are handoff artifacts; TOML/PostgreSQL advisory
notes remain opt-in and must not be treated as verifier input, runtime
authority, or approval.

## Compiler Authority Matrix

| Surface                       | Authority                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 JSON                       | Canonical Forge input/output authority. The `--input` / `--output` command does not require v2 compiler state.                                  |
| v2 `pack-draft.toml`          | Byte-stable review contract only. It is never verifier, export, promotion, or product truth authority.                                          |
| direct `pg` PostgreSQL        | Compiler state for evidence, provenance, review events, artifacts, migrations, and promotion records.                                           |
| PostgreSQL MCP                | Advisory/operator evidence only. It is not runtime infrastructure, compiler input authority, verifier authority, or promotion authority.        |
| Workspace `verify-capability` | Declared-contract check only. Forge v2 must not change verifier semantics.                                                                      |
| promotion output              | Approved-only Forge v2 artifact promotion. A failed, conflicted, or reconcile-required promotion must not leave a partial authoritative target. |

## Compiler State Machine

`migrate -> ingest -> search -> draft -> validate -> export-bmad -> promote`

- `migrate`: apply checked migrations and record checksums.
- `ingest`: scan configured local evidence roots, mark prior evidence stale,
  then refresh current file spans.
- `search`: read compiler evidence state for operator review; search results
  are not authority.
- `draft`: render deterministic `pack-draft.toml` from non-stale evidence.
- `validate`: parse `pack-draft.toml` and match it against database-backed
  compiler state before report write.
- `export-bmad`: validate first, then emit BMAD handoff artifacts only.
- `promote`: require `--approved`, acquire the promotion lock, prepare the row,
  stage artifacts outside every configured runtime root, publish with atomic
  no-replace behavior, then finalize or report a recovery code.

Recovery codes:

- `FORGE_DRAFT_STALE_EVIDENCE`: re-run `ingest`, regenerate `draft`, then
  review the new TOML before validating again.
- `FORGE_PROMOTE_CONFLICT`: inspect target state and retry only after the
  conflict is resolved.
- `FORGE_PROMOTE_RECONCILE_REQUIRED`: inspect target artifacts before retrying.
- `FORGE_PROMOTE_COPY_FAILED`: staging copy or publish failed; Forge removes
  the temp directory, leaves no authoritative target, and marks promotion
  `failed`.

## Boundaries

Forge must not:

- call live Context7, MCP, Docker, Git, Codex app-server, Apple Passwords,
  keychain, or network
- add or change `bmad workspace` commands
- change `bmad workspace verify-capability`
- read `_bmad/custom` as authority
- install skills
- configure MCP
- run Graphify
- query databases except the configured Forge v2 PostgreSQL compiler state
  through direct `pg`
- launch Docker
- start or configure Desktop Commander MCP or run shell commands
- execute Codex task packets
- store raw secrets, raw connection strings, query results, live schema/sample
  rows, Docker/MCP state, or network proof
- invoke, satisfy, approve, or mark complete BMAD review workflows from compiler
  handoff packets
- promote unapproved drafts, unsafe targets, symlink targets, path traversal, or
  dirty worktrees without an explicit tested override path
- call live file search, skill-loading, database, web, memory, or shell tools to
  satisfy generated Agentic Search metadata

Allowed PostgreSQL credential signal is only `POSTGRES_URL=set|unset`. Reject
raw `POSTGRES_URL`, `DATABASE_URL`, `PGPASSWORD`, `postgres://` /
`postgresql://`, `queryResults`, `liveMcp`, `postgres_live`, `dockerRuntime`,
`network`, live schema fields, and sample row fields.

`kind: "bmad-capability-pack"` means artifact identity only. It is not a grant,
install manifest, execution permission, verifier proof, or runtime authority.

## Validation

Run targeted validation after Forge changes:

```bash
node {project-root}/test/test-capability-pack-forge.js
node {project-root}/test/test-capability-forge-v2.js
node {project-root}/test/test-workspace-contracts.js
node {project-root}/test/test-workspace-cli.js
npm run validate:skills
npm run validate:refs
npm run validate:graphify-manifests
```

Before push readiness, run:

```bash
npm ci && npm run quality
```
