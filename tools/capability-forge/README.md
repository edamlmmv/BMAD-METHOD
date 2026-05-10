# Capability Forge Compiler Path

Capability Forge adds a compiler-style path for turning local evidence into
reviewable, promotable BMAD capability-pack artifacts.

```text
local evidence
  -> PostgreSQL compiler state
  -> pack-draft.toml
  -> BMAD draft artifacts
  -> explicit approved promotion
```

## Boundary

- Current JSON behavior remains unchanged: `tools/capability-pack-forge.js --input <json> --output <dir>`.
- PostgreSQL is the compiler state store for evidence, provenance, review
  events, artifact state, migration records, and promotion records.
- Forge v2 uses the direct Node `pg` adapter and requires
  `CAPABILITY_FORGE_DATABASE_URL` for live compiler commands.
- Normal deterministic tests do not require a live database; live migration
  coverage is opt-in when `CAPABILITY_FORGE_DATABASE_URL` is set.
- `pack-draft.toml` is a generated review contract. If a reviewer edits it,
  Forge must match it against database-backed compiler state before export or
  promotion.
- PostgreSQL MCP is advisory/operator evidence only. Forge infrastructure code
  connects through the direct `pg` adapter in `store-postgres.js`.
- BMAD review exports are handoff/input packets only. Forge must not invoke,
  satisfy, approve, or mark complete BMAD workflows.
- Promotion writes only validated, approved draft artifacts to configured safe
  targets.

## Authority Matrix

| Surface                       | Authority                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 JSON                       | Canonical Forge input/output authority. The `--input` / `--output` command does not require v2 compiler state.                                  |
| v2 `pack-draft.toml`          | Byte-stable review contract only. It is never verifier, export, promotion, or product truth authority.                                          |
| direct `pg` PostgreSQL        | Compiler state for evidence, provenance, review events, artifacts, migrations, and promotion records.                                           |
| PostgreSQL MCP                | Advisory/operator evidence only. It is not runtime infrastructure, compiler input authority, verifier authority, or promotion authority.        |
| Workspace `verify-capability` | Declared-contract check only. Forge v2 must not change verifier semantics.                                                                      |
| promotion output              | Approved-only Forge v2 artifact promotion. A failed, conflicted, or reconcile-required promotion must not leave a partial authoritative target. |

## State Machine

`migrate -> ingest -> search -> draft -> validate -> export-bmad -> promote`

- `migrate`: apply checked migrations and record checksums.
- `ingest`: scan configured local evidence roots, mark prior evidence stale, then refresh current file spans.
- `search`: read compiler evidence state for operator review; search results are not authority.
- `draft`: render deterministic `pack-draft.toml` from non-stale evidence.
- `validate`: parse `pack-draft.toml` and match it against database-backed
  compiler state before report write.
- `export-bmad`: validate first, then emit BMAD handoff artifacts only.
- `promote`: require `--approved`, acquire the promotion lock, prepare the row,
  copy through a temp directory outside every configured runtime root,
  atomically publish, then finalize or report recovery code.

## Commands

All compiler commands require `.capability-forge/forge.toml` with
`workspace.write_mode = "draft_only"`.

```bash
node tools/capability-pack-forge.js migrate --config .capability-forge/forge.toml
node tools/capability-pack-forge.js ingest --config .capability-forge/forge.toml
node tools/capability-pack-forge.js search --config .capability-forge/forge.toml --query "offline sync"
node tools/capability-pack-forge.js draft --config .capability-forge/forge.toml --slug offline-sync --title "Offline Sync"
node tools/capability-pack-forge.js validate --config .capability-forge/forge.toml --slug offline-sync
node tools/capability-pack-forge.js export-bmad --config .capability-forge/forge.toml --slug offline-sync
node tools/capability-pack-forge.js promote --config .capability-forge/forge.toml --slug offline-sync --target .agents/skills/offline-sync --approved
node tools/capability-pack-forge.js reset-dev --config .capability-forge/forge.toml --yes
```

`reset-dev` drops only the configured Forge schema and exists for local
development cleanup.

## Promotion Safety

Promotion is the only authority-changing step in the compiler path. It uses a
PostgreSQL advisory transaction lock for the pack/target pair, prepares a
promotion row before file copy, stages artifacts outside every configured
runtime root, publishes the complete target with atomic no-replace behavior,
and finalizes the row only after the target exists.

Failure behavior is explicit:

- staging copy or publish failure removes the temp directory, leaves no target
  directory, and marks the promotion row `failed`;
- a matching prepared row plus existing target finalizes on retry;
- a prepared row with mismatched target snapshot fails with
  `FORGE_PROMOTE_RECONCILE_REQUIRED`;
- concurrent promotion fails with `FORGE_PROMOTE_CONFLICT` before target
  mutation;
- existing promoted or unrelated target paths fail as collisions.

Stale evidence is tracked during ingest: previously seen evidence files are
marked stale before the current file set is refreshed. If `pack-draft.toml`
references stale evidence, `validate`, `export-bmad`, and `promote` fail until
the operator re-runs `ingest` and regenerates the draft. The stable error code
is `FORGE_DRAFT_STALE_EVIDENCE`.

Operator recovery:

- `FORGE_DRAFT_STALE_EVIDENCE`: re-run `ingest`, regenerate `draft`, then review the new TOML before validating again.
- `FORGE_PROMOTE_CONFLICT`: another promotion or existing target won; inspect target state and retry only after the conflict is resolved.
- `FORGE_PROMOTE_RECONCILE_REQUIRED`: prepared database state and target snapshot differ; inspect target artifacts before retrying.
- `FORGE_PROMOTE_COPY_FAILED`: staging copy or publish failed; Forge removes the temp directory, leaves no authoritative target, and marks promotion `failed`.

## State Model

Pack draft states are:

```text
ingested -> drafted -> review_pending -> approved -> promoted
                                  \-> rejected
                                  \-> superseded
```

Review events are append-only by application contract. Current status is stored
on `pack_draft` and updated transactionally with review events.

## Migration Policy

Migrations live in `tools/capability-forge/migrations/`. Each applied migration
is recorded with a SHA-256 checksum in `schema_migration`. Checksum drift fails
closed. Destructive rollback is not silent; forward repair migrations are the
supported path.
