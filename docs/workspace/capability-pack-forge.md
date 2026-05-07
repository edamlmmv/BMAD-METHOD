---
title: 'Capability Pack Forge'
description: Local artifact generator for draft BMAD capability packs
---

# Capability Pack Forge

Capability Pack Forge turns local evidence files into reviewable BMAD
capability-pack drafts. It helps operators move from evidence refs to repeatable
BMAD artifacts without changing Workspace runtime behavior.

## Mental Model

Forge consumes evidence files, emits draft capability-pack artifacts, then a
human reviews the output and chooses the next BMAD workflow.

It is not a Workspace subcommand, verifier, scheduler, installer, grant source,
live adapter, or `_bmad/custom` authority.

## Scope

| In v1                                                                           | Out of scope                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Local `forge-request.json` input                                                | Live Context7 or MCP calls                                                          |
| Local evidence refs, including optional Context7 docs or Zsh Shell MCP evidence | Docker, PostgreSQL, Desktop Commander MCP, shell, Git, Graphify, or Codex execution |
| Existing or candidate Capability Request JSON                                   | Workspace command additions                                                         |
| Optional advisory evidence references                                           | `verify-capability` behavior changes                                                |
| Draft TOML, skill, readiness, and Codex task artifacts                          | Skill install or `_bmad/custom` writes                                              |
| Deterministic manifest and output schema                                        | Runtime authority, grant authority, or hidden execution                             |

JSON is the only Forge input authority in v1. TOML is generated draft output
routed through `bmad-customize`; Forge does not parse TOML input. PostgreSQL is
a declared/generated capability domain only, not live Forge infrastructure.

## Command

```bash
node tools/capability-pack-forge.js --input <forge-request.json> --output <dir>
```

The request file and all evidence refs must be local files. Evidence refs are
references, not integrations.

Forge requests use `evidenceRefs[]` as the primary evidence input. Each ref
records a local path plus `sourceType` such as `context7`, `local_docs`,
`manual_contract`, `repo_template`, or `other`. The older `context7EvidenceRef`
field is accepted as a compatibility alias and normalized into `evidenceRefs[]`.

`packMode: "verifier-ready"` requires a verifier-compatible
`capabilityRequestRef`. `packMode: "draft-authoring"` emits reviewable draft
artifacts without claiming verifier compatibility.

Optional request fields are `capabilityDomain: "postgresql"` and
`draftAuthoring: "toml"`. PostgreSQL packs may record only
`POSTGRES_URL=set|unset`; raw connection strings, raw DB env vars, query
results, live schema/sample rows, Docker/MCP state, and network proof are
rejected.

## Outputs

Forge writes:

- `manifest.json`
- `capability-pack.json`
- `capability-request.json`
- `operator-evidence-template.json`
- `customization-draft.toml`
- `skill-outline.md`
- `readiness-checklist.md`
- `codex-task-packet.md`

`capability-pack.json` uses `kind: "bmad-capability-pack"` and
`schemaVersion: 1`. That identity is not a grant, install manifest, execution
permission, verifier proof, or runtime authority.

## Review Path

1. Review `capability-pack.json` and `manifest.json`.
2. Run `bmad workspace verify-capability --input <output>/capability-request.json`
   if verifier compatibility evidence is needed.
3. Route `customization-draft.toml` through `bmad-customize` before writing any
   override.
4. Treat `codex-task-packet.md` as an instruction draft only.
5. Record actual operator decisions through existing BMAD Workspace evidence
   flows when needed.

## Boundaries

Forge must not call live Context7, MCP, Docker, PostgreSQL, Git, Codex
app-server, Desktop Commander MCP, shell commands, Apple Passwords, keychain, or
network. It must not store raw secrets, query results, connection strings, or
API keys.

Forge does not alter `bmad workspace`, `verify-capability`, Workspace
Capability Contract matching, Grant Guard, Evidence Gate behavior, or
Self-Improve continuation policy.

## Compiler Path

Forge adds an optional compiler-style path for larger capability-pack work:

```text
local evidence files
  -> PostgreSQL compiler state
  -> pack-draft.toml
  -> BMAD draft artifacts
  -> explicit approved promotion
```

The current JSON `forge-request.json` command and existing generated artifacts
remain stable.

### Compiler Contracts

- `.capability-forge/forge.toml` is required and must set
  `workspace.write_mode = "draft_only"`.
- PostgreSQL is compiler state for evidence, provenance, review events,
  artifact state, migrations, and promotion records.
- Live compiler commands require `CAPABILITY_FORGE_DATABASE_URL` and use the
  direct Node `pg` adapter. Normal deterministic tests do not require a live
  database; live migration coverage is opt-in when that environment variable is
  set.
- `pack-draft.toml` is a reviewable contract generated from PostgreSQL state.
  If edited, it must be reconciled and validated before export or promotion.
- PostgreSQL MCP remains advisory/operator evidence only. Forge infrastructure
  uses the direct `pg` adapter.
- BMAD review exports are handoff/input packets only. Forge does not invoke,
  satisfy, approve, or mark complete BMAD workflows.
- Promotion writes only validated, approved draft artifacts to configured safe
  targets and blocks unsafe paths, collisions, symlinks, and dirty worktrees
  unless an explicit tested override exists.

### Authority Matrix

| Surface                       | Authority                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 JSON                       | Canonical Forge input/output authority. The `--input` / `--output` command does not require v2 compiler state.                                  |
| v2 `pack-draft.toml`          | Byte-stable review contract only. It is not product truth until validated and explicitly promoted.                                              |
| direct `pg` PostgreSQL        | Compiler state for evidence, provenance, review events, artifacts, migrations, and promotion records.                                           |
| PostgreSQL MCP                | Advisory/operator evidence only. It is not runtime infrastructure, compiler input authority, verifier authority, or promotion authority.        |
| Workspace `verify-capability` | Declared-contract check only. Forge v2 does not change Workspace verifier semantics.                                                            |
| promotion output              | Approved-only Forge v2 artifact promotion. A failed, conflicted, or reconcile-required promotion must not leave a partial authoritative target. |

### State Machine

`migrate -> ingest -> search -> draft -> validate -> export-bmad -> promote`

- `migrate`: apply checked migrations and record checksums.
- `ingest`: scan configured local evidence roots, mark prior evidence stale,
  then refresh current file spans.
- `search`: read compiler evidence state for operator review; search results
  are not authority.
- `draft`: render deterministic `pack-draft.toml` from non-stale evidence.
- `validate`: parse and reconcile `pack-draft.toml` before report write.
- `export-bmad`: validate first, then emit BMAD handoff artifacts only.
- `promote`: require `--approved`, acquire the promotion lock, prepare the row,
  copy through a temp directory, atomically rename, then finalize or report a
  recovery code.

### Compiler Commands

```bash
node tools/capability-pack-forge.js migrate --config .capability-forge/forge.toml
node tools/capability-pack-forge.js ingest --config .capability-forge/forge.toml
node tools/capability-pack-forge.js search --config .capability-forge/forge.toml --query "offline sync"
node tools/capability-pack-forge.js draft --config .capability-forge/forge.toml --slug offline-sync --title "Offline Sync"
node tools/capability-pack-forge.js validate --config .capability-forge/forge.toml --slug offline-sync
node tools/capability-pack-forge.js export-bmad --config .capability-forge/forge.toml --slug offline-sync
node tools/capability-pack-forge.js promote --config .capability-forge/forge.toml --slug offline-sync --target .agents/skills/offline-sync --approved
```

`reset-dev --yes` drops only the configured Forge schema for local development
cleanup.

### Promotion Failure Model

Promotion is the only authority-changing compiler step. Forge uses a
PostgreSQL advisory transaction lock for the pack/target pair, prepares a
promotion row before file copy, copies artifacts through a sibling temporary
directory, atomically renames the temporary directory into place, and finalizes
the row only after the target exists.

Failure handling is explicit:

- copy or rename failure removes the temporary directory, leaves no target
  directory, and marks the promotion row `failed`;
- a matching prepared row plus existing target finalizes on retry;
- a prepared row with a mismatched target snapshot fails with
  `FORGE_PROMOTE_RECONCILE_REQUIRED`;
- concurrent promotion fails with `FORGE_PROMOTE_CONFLICT` before target
  mutation;
- existing promoted or unrelated target paths fail as collisions.

During ingest, previously seen evidence files are marked stale before the
current file set is refreshed. If `pack-draft.toml` references stale evidence,
`validate`, `export-bmad`, and `promote` fail until the operator re-runs
`ingest` and regenerates the draft. The stable error code is
`FORGE_DRAFT_STALE_EVIDENCE`.

Operator recovery:

- `FORGE_DRAFT_STALE_EVIDENCE`: re-run `ingest`, regenerate `draft`, then
  review the new TOML before validating again.
- `FORGE_PROMOTE_CONFLICT`: another promotion or existing target won; inspect
  target state and retry only after the conflict is resolved.
- `FORGE_PROMOTE_RECONCILE_REQUIRED`: prepared database state and target
  snapshot differ; inspect target artifacts before retrying.
- `FORGE_PROMOTE_COPY_FAILED`: temp copy or rename failed; Forge removes the
  temp directory, leaves no authoritative target, and marks promotion `failed`.
