---
name: bmad-workspace
description: 'Operate BMAD Workspace Sessions from Codex. Use when launching sessions, running Repo Intake, creating BMAD Work Packets, inspecting Evidence Index output, diffing archives, recording manual results, reviewing worktrees, destroying runtime state, or preparing grant-governed base improvements.'
---

# BMAD Workspace

## Purpose

Operate the local BMAD Workspace CLI as a BMAD-first Workspace Session
harness. BMAD remains the source of truth, Codex performs the work, and Git
worktrees provide review and provenance.

## First Check

Before session work, verify the CLI visible to Codex:

```bash
bmad --version
bmad workspace --help
```

Expected: version `6.6.0` or newer and help for `launch`, `intake`, `packet`,
`list`, `status`, `handoff`, `evidence`, `verify-capability`, `diff`,
`result`, `closeout`, `archive`, `verify-archive`, `review`, `destroy`, and
`authorize`.

Fallback when `PATH` is stale:

```bash
node {project-root}/tools/installer/bmad-cli.js workspace --help
```

## Normal Workspace Session

Use this path for target repo work. A normal Workspace Session may write target
repo worktrees and session runtime artifacts. It must not write the Workspace
Base.

```bash
bmad workspace launch --repo <target-repo> --goal <goal-file> --runtime-root <runtime-root>
bmad workspace intake <session-id> --runtime-root <runtime-root>
bmad workspace packet <session-id> --runtime-root <runtime-root> \
  --workflow <skill[:action]> \
  --zoom-out-ref <ref> \
  --ubiquitous-language-ref <ref> \
  --grill-decisions-ref <ref> \
  --tdd-plan-ref <ref>
bmad workspace list --runtime-root <runtime-root>
bmad workspace status <session-id> --runtime-root <runtime-root>
bmad workspace handoff <session-id> --runtime-root <runtime-root>
bmad workspace evidence <session-id> --runtime-root <runtime-root>
bmad workspace verify-capability --input <capability-request-json>
bmad workspace result <session-id> --runtime-root <runtime-root> --input <result-json>
bmad workspace review <session-id> --runtime-root <runtime-root>
bmad workspace closeout <session-id> --runtime-root <runtime-root> --input <closeout-json> --closeout-id <id>
bmad workspace archive <session-id> --runtime-root <runtime-root> --output <archive-dir>
bmad workspace verify-archive <archive-dir>
bmad workspace diff --left <archive-dir> --right <archive-dir>
bmad workspace destroy <session-id> --runtime-root <runtime-root> --keep-review
```

Treat `packets/bmad-work-packet.json` as the BMAD Work Packet. The rendered
prompt is derived from that packet and is not the source of truth.

Workspace uses one active packet bundle per Workspace Session. Re-running
`bmad workspace packet` explicitly rebuilds that active bundle, including
`packets/bmad-work-packet.json`, `packets/rendered-prompt.md`, and
`packets/executor-contract.json`. Read-only commands never regenerate packet
artifacts.

## Executor Contract

New BMAD Work Packets record `executorContractRef:
packets/executor-contract.json`. The Executor Contract is a manual readiness
artifact only. It declares `executionMode: manual`, `executorKind: codex`,
granted `allowedWriteRoots`, forbidden actions, and manual execution steps.

All refs in the contract are Session-relative POSIX paths except
`allowedWriteRoots`, which are canonical absolute granted roots by design.
Allowed roots come only from Workspace grants and repo worktrees. They are never
inferred from the current working directory.

The contract tells a human or Codex operator to inspect status, use the rendered
prompt, work only inside granted roots, run checks manually, and record evidence
with `bmad workspace result`. It does not invoke Codex, run shell commands,
schedule work, activate live adapters, restore, replay, merge, promote, or write
outside granted roots.

## Workspace Graph Evidence

Workspace graph evidence is session-scoped graph context recorded from existing
target-repo `graph/*.graph.json` artifacts during Repo Intake. It is exposed at
`intake/graph.json`; `intake/repo-intake.json` records `graphEvidenceRef` and
`graphEvidenceState`, while `intake/provenance.json` records graph input hashes
and validation state.

Graph evidence is advisory: source files remain authority before planning,
recommendations, edits, or tool calls. It helps BMAD agents and Codex choose
files, searches, and follow-up checks, but it does not authorize writes, pushes, MCP activation, hidden execution, or Graphify regeneration.

Graphify is not called ad hoc by Workspace. Missing or invalid graph artifacts
must not block ordinary Repo Intake; Workspace records the evidence state and
continues with git intake.

## Evidence Gate v1

New BMAD Work Packets use `packetVersion: 5` with `evidenceGates` declarations
and `evidenceRefs` pointers. `workspace packet` validates required Evidence Gate
v1 entries before writing the packet and fails with `EVIDENCE_GATE_FAILED` when
required graph evidence is missing, invalid, or stale.

`workspace status` and `workspace evidence` recompute gate state as read-only
projections from the packet and referenced artifacts. They do not persist pass
or fail status back into the packet.

## Capability Verification

Use `bmad workspace verify-capability --input <capability-request-json>` to
check one self-contained Capability Request JSON against declared Workspace
Capability Contract entries. This is a declared-contract compatibility check
only: exact case-sensitive capability id matching plus existing contract
constraints for session type, provider, group, interface, writes, and outputs.

Embedded `capabilities[]` declarations must include the current declared
capability fields. Missing or malformed declaration fields fail before matching,
and duplicate exact ids fail closed. Advisory observations are preserved only
after the request and declarations are valid.

`ok: true` never means runtime availability or permission. The verifier does
not read `_bmad/custom`, local Codex config, app-server APIs, live Graphify
state, or Workspace Session artifacts. `requiresGrant` is reported as advisory;
`bmad workspace authorize` remains the grant authority. Use
`docs/workspace/templates/capability-request.template.json` as the authoring
example. Use
`docs/workspace/templates/capability-request.codex-manual.example.json` for a
Codex manual executor fixture and
`docs/workspace/templates/capability-request.graphify-repo-intake.example.json`
for a Graphify repo-intake fixture. Use
`docs/workspace/templates/capability-request.git-worktree-review.example.json`
for a Git Worktree Review fixture. Use
`docs/workspace/templates/capability-request.context7-docs.example.json` for a
Context7 Docs MCP fixture and
`docs/workspace/templates/capability-request.git-mcp-local.example.json` for a
Git local MCP fixture. Use
`docs/workspace/templates/capability-request.zsh-shell-mcp.example.json` for a
Zsh Shell MCP fixture. Use
`docs/workspace/templates/capability-request.outlook-calendar-mcp.example.json`
for an Outlook Calendar remote MCP fixture.

`docs/workspace/capability-profile-registry.json` is advisory authoring context
for named tools such as Codex, Graphify, Git, Context7 MCP, Git MCP, Docker MCP
Toolkit, Desktop Commander MCP, PostgreSQL MCP, Google Calendar MCP, and
Outlook Calendar MCP. It maps profiles to exact capability ids, support states,
trust boundaries, evidence refs, and repair hints. It is not verifier input,
grant authority, runtime availability proof, or support-promotion authority.

Use the profile registry to explain known Codex and Graphify affordances before
authoring a Capability Request: Codex config and app-server context remain
operator context, while Graphify query, MCP, hook, watch, regeneration, and
`commandEvidence` surfaces remain advisory graph context. `commandEvidence`
uses `uv tool run --from graphifyy graphify ...` for operator-run smoke checks;
it is not verifier input, support promotion, grant authority, or hidden
execution. Codex manual executor readiness is human-mediated/manual and is not
a guarantee that a runnable local Codex CLI exists. Record any actual operator
observation through `bmad workspace result` or `bmad workspace closeout`; never
treat the profile as execution evidence.

Git Worktree Review uses declared id `repo.git.worktree-review`. Treat
`git status`, `git diff`, and `git diff --cached` as manual review evidence
only. They can explain dirty state, changed files, and patch evidence; they do
not authorize push, reset, clean, merge, hidden execution, or target repo
mutation.

Context7 Docs MCP uses declared id `host.mcp.context7.docs`. Treat Context7 as
optional docs evidence only. Context7 can fetch current documentation, including
MCP and Git MCP docs, but it does not perform Git operations, configure MCP
servers, authorize writes, or prove runtime availability. Recommended local
credential source is Apple Passwords item `Context7`; the operator may manually
expose only `CONTEXT7_API_KEY` in a local shell/session. Record
`CONTEXT7_API_KEY=set` or unset and
`credentialSource: "Apple Passwords item Context7"` only; never record the key
value, keychain output, screenshots, logs, PR text, or issue text containing
the secret.

Git local MCP uses declared id `host.mcp.git.local`. Treat `mcp-server-git` as
optional local repository tools. Status, diff, log, and branch observations are
manual evidence only; add, commit, and branch write tools are manual/grant-gated
and never replace Grant Guard. GitHub connector or GitHub MCP state is separate
from local Git MCP. Local `git` CLI remains fallback and exact pre-push
authority, including `npm ci && npm run quality` on the exact checkout and
`HEAD` being pushed.

Zsh Shell MCP uses declared id `host.mcp.shell.zsh`. Treat Desktop Commander
MCP as optional, third-party, zsh-capable operator evidence only. Use
`docs/workspace/zsh-shell-mcp-capability-planning.md`,
`docs/workspace/templates/capability-request.zsh-shell-mcp.example.json`, and
`docs/workspace/templates/zsh-shell-mcp-operator-evidence.template.json`.
Desktop Commander clears the explicit 1000+ GitHub star candidate gate but is
not an official MCP addition or endorsement. It exposes broad host terminal,
filesystem, and process controls; live MCP availability, defaultShell state,
allowedDirectories state, command output, host file/process access, Codex
config, npm state, Docker state, and remote MCP state are not verifier input.
Do not auto-install, auto-start, configure MCP, access secrets, read shell
history, run destructive commands, schedule work, launch daemons, activate live
adapters, or write `_bmad/custom`. In zsh docs, single-quote inline `node -e`
programs so JavaScript template literals such as `${p.profileId}` reach Node
unchanged.

PostgreSQL MCP uses declared id `host.mcp.postgresql.readonly`. Treat
`modelcontextprotocol/server-postgres` as archived/deprecated reference
metadata for optional/operator-provided read-only database evidence, not
endorsement or runtime proof. Use
`docs/workspace/postgresql-mcp-capability-planning.md` and
`docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`.
Record `POSTGRES_URL=set` or unset only, never the connection string value.
Read-only evidence can expose sensitive rows, so require least-privilege scope,
allowed schemas/tables, denied writes, and why DB evidence is needed. Live
PostgreSQL, Docker, MCP, network, Codex config, local MCP config,
`_bmad/custom`, Workspace Session artifacts, and query results are not verifier
input.

For Google Calendar remote MCP planning, use
`docs/workspace/google-calendar-capability-planning.md` and
`docs/workspace/templates/capability-request.google-calendar-mcp.example.json`.
The exact declared id is `host.mcp.google-calendar.remote`. Keep Calendar MCP,
Google Workspace docs MCP, Calendar API, Codex Google Calendar connector,
Workspace verifier, and any local Google Workspace add-on target repo separate.
Live MCP discovery, connector availability, Codex config, local OAuth setup,
`appsscript.json`, Calendar API enablement, Apps Script triggers, and deployment
state are not verifier input, grant authority, or runtime guarantees. Name
indirect prompt injection as a security risk and require human review before
Calendar-affecting actions.

For Outlook Calendar remote MCP planning, use
`docs/workspace/outlook-calendar-capability-planning.md` and
`docs/workspace/templates/capability-request.outlook-calendar-mcp.example.json`.
The exact declared id is `host.mcp.outlook-calendar.remote`. Keep Outlook
Calendar MCP, Microsoft Graph calendar APIs, Office.js Outlook add-in runtime,
Codex Outlook/Calendar connector state, Workspace verifier, and any target repo
manifest separate. Live MCP discovery, connector availability, Graph permission
state, Office.js runtime state, local OAuth setup, token cache, mailbox state,
event payloads, and calendar contents are not verifier input, grant authority,
or runtime guarantees. Record `OUTLOOK_CALENDAR_AUTH=set` or unset only, never
OAuth tokens, refresh tokens, mailbox screenshots, event payloads, logs, or
calendar contents. Require human review before Calendar-affecting actions.

## Codex Operator Affordances

Codex slash commands, tools, hooks, plugins, and future UI commands are operator
affordances only. Use them to keep the manual work legible, then record durable
evidence with Workspace commands.

`/goal` is useful when Codex `features.goals` is enabled. Use it to keep the
active thread objective visible, then put the durable objective and acceptance
criteria in the goal file passed to `bmad workspace launch`. If a Codex goal id,
status, or completion decision matters, record it through `bmad workspace
result` or `bmad workspace closeout`.

Treat `~/.codex/config.toml` as capability context, not Workspace authority:
`features.goals` may indicate `/goal`; `features.multi_agent` may indicate
subagents or party-mode review; `features.codex_hooks` may indicate passive
hook reminders; enabled plugins may indicate generic adapter capabilities. None
of these authorize hidden execution, scheduler, watcher, restore, replay, merge,
promotion, live adapter activation, or writes outside grants.

Future slash commands should stay generic. Each command needs a name, required
capability, inputs, expected evidence refs, and an operator-assist-only
boundary before it belongs in the Workspace flow.

For fresh Codex chats that need Workspace awareness, start from:

- `{project-root}/docs/workspace/templates/fresh-chat-prompt.md`

The prompt is an operator aid only. It does not authorize hidden execution,
Workspace mutation, scheduler behavior, watcher behavior, restore, replay,
merge, promotion, or live adapter activation.

## Routing Contract

Packets include deterministic BMAD workflow routing:

- New packets record `routing.routingSchemaVersion: 1`.
- `bmadWorkflow` is a compatibility alias for `routing.selectedWorkflow`.
- `--workflow <skill[:action]>` explicitly selects a route from the BMad Method
  workflow catalog.
- Unknown, agent-only, or non-routeable workflow overrides fail before packet
  artifacts are written.
- Empty or ambiguous deterministic goals fail closed and require explicit
  `--workflow`.

Routing prepares the next manual BMAD workflow only. It does not run, schedule,
watch, restore, replay, merge, promote, or call live adapters.

## Result Ledger

Use result to record manual execution evidence after a BMAD Work Packet exists:

```bash
bmad workspace result <session-id> --runtime-root <runtime-root> --input <result-json> --result-id <id>
```

The input is JSON data only. Workspace records outcome, summary, command text,
evidence refs, and optional failure details under `results/<resultId>.json`.
It never executes commands from the input.

Result recording fails before writing when:

- the session or BMAD Work Packet is missing or invalid
- `--result-id` is unsafe or already exists
- input JSON is malformed or has invalid outcome
- high-confidence secrets are detected

Results are manual evidence only. They do not restore, replay, schedule,
execute, merge, promote, or call live adapters.

## Manual Closeout

Use closeout to record a final manual Session decision after packet, result, and
review evidence:

```bash
bmad workspace closeout <session-id> --runtime-root <runtime-root> --input <closeout-json> --closeout-id <id>
```

The input is JSON data only. Workspace records outcome, next action, summary,
packet ref, routing, Executor Contract ref, valid result refs, review ref, and
optional evidence refs under `closeout/<closeoutId>.json`. It never executes
commands from the input.

Allowed `outcome` values are `completed`, `blocked`, `abandoned`, and
`continued`. Allowed `nextAction` values are `manual-target-review`,
`manual-base-review`, `manual-archive-review`,
`manual-continuation-review`, and `manual-discard-review`.

Closeout recording fails before writing when:

- the session or BMAD Work Packet is missing or invalid
- the declared Executor Contract is missing or invalid
- completed closeout is requested before Worktree Review exists
- `--closeout-id` is unsafe or already exists
- input JSON is malformed or has invalid outcome/next action
- high-confidence secrets are detected

Closeouts are manual evidence only. They do not archive, destroy, execute,
restore, replay, schedule, watch, merge, promote, or call live adapters.

## Capability Evidence Gate Closeout

Use Capability Evidence Gate Closeout when work claims capability awareness,
Capability Verification behavior, advisory Codex or Graphify support, or
push/PR readiness. Workspace records evidence; it does not execute or authorize the closeout.

Record the closeout as reviewer/operator evidence with:

- claimed capabilities and commit refs
- touched files and file links
- verifier or advisory profile evidence refs
- TDD red-green provenance
- targeted test and full quality command outcomes
- warning/LOW disposition
- dirty worktree impact
- residual risk
- exact push/PR next step

`npm ci && npm run quality` is a quality gate, not TDD provenance. Any warning
or LOW finding must be marked `accepted`, `fixed`, `deferred`, or
`false-positive` with a reason. Modified or untracked leftovers must be named,
scoped, and either included, ignored, or deferred before push.

## Setup Gate

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Every BMAD Work Packet requires setup entries for:

- zoom-out
- ubiquitous language
- grill decisions
- TDD plan

Internal packet refs remain `zoomOut`, `ubiquitousLanguage`,
`grillDecisions`, and `tddPlan`; these refs are stable Workspace evidence
fields, not separate CLI commands.

Use shared BMAD planning capabilities to produce or check setup evidence when
the Workspace goal needs them:

| Capability                                             | Use when                                                              | Workspace ref        |
| ------------------------------------------------------ | --------------------------------------------------------------------- | -------------------- |
| `capability:zoom-out` `zoom-out`                       | Reframe problem, constraints, alternatives, and chosen path.          | `zoomOut`            |
| `capability:tdd` `tdd`                                 | Plan failing-test-first implementation guidance.                      | `tddPlan`            |
| `capability:ubiquitous-language` `ubiquitous-language` | Align terms across docs, prompts, help, and code-facing names.        | `ubiquitousLanguage` |
| `capability:grill-me` `grill-me`                       | Challenge a plan at checkpoint and record changed/deferred decisions. | `grillDecisions`     |

Each setup entry must be complete with a ref or skipped with an explicit reason.
Use `--skip-setup <step=reason>` only when the user accepts the skip.

Setup refs may be local or external:

- bare path or `file:<path>`: local evidence file; BMAD Workspace records
  `sha256` and later reports checksum drift.
- `external:<ref>`: opaque provenance; no network fetch, no checksum, warning
  only as `external-unverified`.

## Status

Use status to inspect a Workspace Session without changing it:

```bash
bmad workspace status <session-id> --runtime-root <runtime-root>
```

Status reads session artifacts and reports blockers such as missing intake,
stale intake, missing packet, setup checksum drift, invalid or secret-positive
results, invalid or secret-positive closeouts, missing review, and Base
Improvement readiness. Missing results and missing closeouts are not blockers.
Status also reports `derivedLifecycle` from stored artifacts only; it does not
persist or authorize workflow state.

Status does not create, repair, resume, run, fetch, schedule, watch, promote, or
merge anything.

## List

Use list to inventory Workspace Sessions without changing them:

```bash
bmad workspace list --runtime-root <runtime-root>
```

List emits JSON for known session directories. It reports invalid entries with
`SESSION_INVALID`, does not follow symlinks, and does not infer latest/current
sessions.

## Handoff

Use handoff to produce copy-ready Codex continuation context:

```bash
bmad workspace handoff <session-id> --runtime-root <runtime-root>
```

Handoff emits raw Markdown with fixed sections for identity, status, blockers,
BMAD Work Packet, Executor Contract, Setup Gate, Result Ledger, Worktree Review,
Review Manifest, Closeout, Base Improvement readiness, next BMAD route, and
read-only boundary.

Handoff requires an explicit session id. It does not create, repair, resume,
fetch, schedule, watch, execute, apply changes, or change durable state.

## Review Manifest

Use review to create Worktree Review artifacts and typed Review Manifest
evidence:

```bash
bmad workspace review <session-id> --runtime-root <runtime-root>
```

Review Manifest lives at `review/review-manifest.json`. It records source refs,
allowed review artifact capabilities, forbidden actions, checks, findings, and
a manual decision state. It is evidence only. It does not approve, score,
restore, replay, merge, promote, schedule, watch, fetch, execute, or activate
adapters.

## Evidence Index

Use evidence to inspect stored Session artifacts without changing them:

```bash
bmad workspace evidence <session-id> --runtime-root <runtime-root>
```

Evidence emits JSON with `schemaVersion: 1`, `sessionId`, `sessionRoot`,
`generatedAt`, `state`, `artifacts`, and `checks`. Artifacts include stage,
kind, ref, presence, validation state, `sha256`, bytes, and source command.
Checks include stable code, severity, message, ref, and `nextManualAction`.

Evidence is read-only. It does not create, repair, fetch, execute, archive,
destroy, restore, replay, merge, promote, schedule, watch, or activate adapters.

## Archive

Use archive to capture a portable evidence bundle for a Workspace Session:

```bash
bmad workspace archive <session-id> --runtime-root <runtime-root> --output <archive-dir>
```

Archive creates the exact requested output directory and fails if it already
exists. It writes only that output directory. It copies known Session artifacts,
valid result artifacts, valid closeout artifacts, Review Manifest, status,
handoff, closeout notes, Evidence Index, and checksums. It does
not copy target repo contents, Workspace Base contents, local setup evidence
files, secrets, or whole runtime directories.

The archive is an evidence bundle. It is not a restore package, import package,
replay input, execution plan, scheduler input, or durable state action.

## Verify Archive

Use verify-archive to inspect archive integrity without changing it:

```bash
bmad workspace verify-archive <archive-dir>
```

Verify checks `manifest.json`, required files, safe relative paths, SHA-256
checksums, archived result shape, archived closeout shape, Review Manifest
shape, and Evidence Index shape for archives that match the current Workspace
archive manifest contract. It does not fetch, repair, probe repos, restore,
import, execute, schedule, merge, or change durable state.

## Diff

Use diff to compare two verified Workspace archive evidence bundles without
changing them:

```bash
bmad workspace diff --left <archive-dir> --right <archive-dir>
```

Diff emits JSON with `schemaVersion: 1`, `diffVersion: 1`, source descriptors,
summary counts, file deltas, status deltas, Evidence Index deltas, packet
deltas, and closeout deltas. Inputs must verify under the current Workspace
archive manifest contract before comparison.

Diff is read-only. It does not fetch, repair, restore, replay, import, sync,
apply, merge, promote, schedule, watch, execute, or activate adapters.

## Base Improvement Session

Use this path only when the user explicitly grants BMAD Workspace mutation.
Require a Base Mutation Grant with scoped allowed paths and a BMAD artifact
reference.

```bash
bmad workspace launch --base-improvement --grant <grant.json> --goal <goal-file> --runtime-root <runtime-root>
bmad workspace authorize <session-id> --write-path <path> --runtime-root <runtime-root>
```

Promotion into the base is explicit only. No auto-promotion.

## Base Improvement Session Kit

For Codex-guided base improvement, start from:

- `{project-root}/docs/workspace/templates/base-improvement-goal.md`
- `{project-root}/docs/workspace/templates/base-mutation-grant.template.json`
- `{project-root}/docs/workspace/templates/bmad-work-packet.template.json`
- `{project-root}/docs/workspace/templates/base-improvement-prompt.md`
- `{project-root}/docs/workspace/templates/worktree-review-checklist.md`

The kit prepares a reviewable BMAD Work Packet. It does not execute a hidden
run, expand grants, or promote changes.

## Guardrails

- Use public CLI behavior first.
- Use temp runtime roots for experiments.
- Check Git status before and after session operations.
- Do not create schedulers, daemons, memory graphs, live adapters,
  auto-promotion, or hidden execution.
- Treat Executor Contract artifacts as manual readiness declarations, not
  runtime permission or execution output.
- Do not treat Result Ledger artifacts as execution, restore, or replay input.
- Do not treat Closeout artifacts as approval, execution, restore, replay,
  merge, promotion, archive, destroy, scheduler, watcher, or adapter input.
- Treat archives as evidence bundles only; never as restore or execution inputs.
- Keep unrelated dirty files untouched.
