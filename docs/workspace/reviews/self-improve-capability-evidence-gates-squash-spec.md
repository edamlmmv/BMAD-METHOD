---
title: "Self-Improve Capability Evidence Gates Squash Specification"
description: "Consolidated BMad Customize and Workspace capability-verifier specification for codex/self-improve-capability-evidence-gates"
---

# Self-Improve Capability Evidence Gates Squash Specification

Review date: 2026-05-05
Branch reviewed: `codex/self-improve-capability-evidence-gates`
Base branch: `main`
Commit range: `main..codex/self-improve-capability-evidence-gates`
Commit count: 83

## Source Inputs

This specification consolidates:

- `docs/reviews/codex-self-improve-capability-evidence-gates.md`
- `docs/workspace/reviews/customize-architecture-corrections-2026-05-05.md`
- `docs/workspace/reviews/self-improve-capability-evidence-gates-customize-review.md`
- Party Mode review voices: Winston, Amelia, Paige, and John.
- BMAD customization docs:
  <https://docs.bmad-method.org/how-to/customize-bmad/> and
  <https://docs.bmad-method.org/how-to/expand-bmad-for-your-org/>
- Codex advanced configuration docs:
  <https://developers.openai.com/codex/config-advanced>
- Graphify docs:
  <https://github.com/safishamsi/graphify#full-command-reference>,
  <https://github.com/safishamsi/graphify/blob/v7/ARCHITECTURE.md>,
  <https://github.com/safishamsi/graphify/blob/v7/docs/docker-mcp-sqlite.md>,
  and <https://github.com/safishamsi/graphify/blob/v7/docs/how-it-works.md>

## Squash Decision

When the branch is viewed as one squash, the product decision is:

> Trust boundary first, customization UX second.

`bmad-customize` is the authoring and education control plane for customization
intent. It can help operators understand and author per-skill overrides, and it
can guide authors through Workspace Capability Request JSON fixtures. It is not
runtime authority for Workspace.

`bmad workspace verify-capability` is a deterministic, self-contained,
declared-contract JSON check. It must evaluate only the submitted Capability
Request JSON payload. It must not inspect ambient project, user, Workspace,
Codex, app-server, Graphify, or customization state.

Central BMad config is a real BMad customization surface, but it is not a
`bmad-customize` v1 authoring target and not verifier input. Central config may
change what roster consumers such as Party Mode see; it does not mutate the
internal behavior of a skill whose activation reads its own per-skill
customization surface.

## Zoom-Out Map

- `src/core-skills/bmad-customize/SKILL.md`: authoring and education workflow
  for sparse per-skill `[agent]` and `[workflow]` overrides under
  `_bmad/custom/`, plus Capability Request guidance.
- `src/core-skills/bmad-workspace/SKILL.md`: Workspace operator contract,
  `verify-capability` boundary, Setup Gate, Evidence Gate, and manual evidence
  semantics.
- `src/core-skills/bmad-self-improve/SKILL.md`: local Codex self-improvement
  runbook, invariant gates, install/refresh evidence, checkpoint, and
  continuation boundary.
- `src/core-skills/bmad-party-mode/SKILL.md`: multi-agent planning and critique
  surface; it may recommend Customize but must not treat Customize as runtime
  authority.
- `docs/workspace/templates/capability-request.template.json`: canonical
  starting fixture for capability verification.
- `tools/workspace/capability-contract.js`: built-in Workspace capability
  declarations.
- `tools/workspace/capability-verifier.js`: CLI wrapper that reads one explicit
  JSON input file.
- `tools/workspace/contracts.js`: Capability Request validation and matching.
- `_bmad/scripts/resolve_customization.py`: merge verification for per-skill
  customization overrides.
- `_bmad/custom/config.toml` and `_bmad/custom/config.user.toml`: valid central
  BMad customization surfaces for roster descriptors and shared install values;
  out of `bmad-customize` v1 scope and forbidden as Capability Verifier input.
- `graphify-out/`: optional repository-contained graph evidence output. Static
  committed artifacts may be referenced as advisory evidence; live Graphify MCP,
  watch, hook, or regeneration flows are forbidden verifier inputs.

## Terminology

- Authoring-time: a human- or skill-guided step that creates reviewable input
  artifacts, such as a sparse TOML override or Capability Request JSON fixture.
- Runtime: behavior executed by Workspace commands, Self-Improve continuation
  gates, grant checks, install checks, refresh checks, or quality gates.
- Resolver evidence: output from `resolve_customization.py` showing how a
  per-skill `customize.toml`, team override, and user override merge.
- Capability Request: a self-contained JSON document with `kind:
  bmad-workspace-capability-request`, `request`, `capabilities`, and optional
  advisory `observations`.
- Central config: `_bmad/custom/config.toml` or
  `_bmad/custom/config.user.toml`. It may describe roster entries or team
  install settings. It is distinct from per-skill behavior customization and is
  outside `bmad-customize` v1.
- Graphify artifact evidence: repository-contained files such as
  `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, or
  `graphify-out/graph.html` already produced before verification. Live Graphify
  execution, MCP access, watch mode, hooks, and regeneration are runtime
  affordances, not verifier inputs.

## Normative Requirements

### CUST-001: Customize Authoring Role

`bmad-customize` MUST remain an authoring and education control plane.

It SHOULD:

- guide users away from hand-authored per-skill TOML when an exposed
  `customize.toml` surface exists;
- write sparse `_bmad/custom/{skill}.toml` or
  `_bmad/custom/{skill}.user.toml` overrides only through exposed `[agent]` or
  `[workflow]` surfaces;
- treat the installed skill's `customize.toml` as the canonical schema and
  defaults reference, never as an override output;
- help with per-skill enterprise recipes such as persistent facts, activation
  hooks, menu items, template swaps, and workflow `on_complete` hooks when those
  fields are exposed;
- verify per-skill overrides with `resolve_customization.py` or a documented
  manual fallback merge;
- guide Workspace capability authors to
  `docs/workspace/templates/capability-request.template.json`;
- explain declared capability fields and what `ok: true` does and does not
  mean.

It MUST NOT:

- invent fields not exposed by a target skill's `customize.toml`;
- generate or mutate `_bmad/custom/config.toml` in v1;
- author recipe 5 central config roster changes in v1;
- claim central config changes internal skill activation behavior;
- make Workspace commands read `_bmad/custom`;
- claim Capability Verification proves runtime availability, write authority,
  install success, refresh success, Self-Improve continuation permission,
  Evidence Gate pass state, or quality success.

### CUST-002: Per-Skill Behavior Changes

Per-skill behavior changes MUST route through existing `customize.toml`
surfaces and resolver evidence.

If a Workspace, Self-Improve, Help, Party Mode, or Customize discussion reveals
agent/workflow behavior drift, the operator may run `bmad-customize` separately
and record resolver evidence as manual context. Workspace status, evidence,
packet creation, archive, closeout, and capability verification MUST NOT infer
behavior changes from raw TOML file presence.

### CUST-003: Central Config Boundary

Central config generation is outside `bmad-customize` v1.

Requests involving `_bmad/custom/config.toml`, roster changes, global
capability declarations, or cross-cutting config generation MUST be routed to
Workspace Capability Contract docs, the customization guide, or a future
separate feature. No v1 workflow may invent central config TOML fields to avoid
this boundary.

Central config may affect roster consumers such as Party Mode because those
surfaces resolve agent descriptors from central config. That is an allowed BMad
behavior, but it is separate from per-skill activation behavior and must not be
used as Capability Verifier evidence.

### CAP-REQ-001: Canonical Request Fixture

Capability verification MUST start from a self-contained Capability Request
JSON fixture, normally derived from:

`docs/workspace/templates/capability-request.template.json`

The fixture MUST contain all declarations needed for matching. The verifier MUST
NOT hydrate declarations from `_bmad/custom`, `customize.toml`, central TOML,
local Codex config, app-server APIs, live Graphify output, or Workspace Session
artifacts.

Advisory `observations[]` MAY cite official documentation URLs or operator
notes, such as Codex config or app-server documentation, but the verifier MUST
NOT fetch, call, inspect, or treat those observations as authority.

If Graphify evidence is needed, the request MAY point at repository-contained
static artifacts already produced before verification, such as
`graphify-out/graph.json`, through explicit JSON fields. The verifier MUST NOT
run Graphify, start Graphify MCP, rely on watch mode, install hooks, read
Graphify cache state, or regenerate graph artifacts.

### CAP-REQ-002: Declaration Shape

`verifyCapabilityRequest` MUST validate embedded `capabilities[]` entries with
the same declaration shape used by Workspace Capability Contract validation.

At minimum, each declaration MUST validate:

- `id`
- `group`
- `provider`
- `interface`
- `allowedInNormalSession`
- `allowedInBaseImprovement`
- `requiresGrant`
- `writes`
- `forbiddenWrites`
- `outputs`
- `upstreamGapProofRequired`

Duplicate exact IDs MUST fail. Unknown fields SHOULD fail closed unless the
contract explicitly adds them. Engine-like declarations MUST keep
`upstreamGapProofRequired` rules.

### CAP-VER-001: Verifier Isolation

`bmad workspace verify-capability` MUST be deterministic and JSON-only.

It MUST NOT:

- read `_bmad/custom`;
- read `customize.toml`;
- read `_bmad/custom/config.toml` or `_bmad/custom/config.user.toml`;
- inspect `~/.codex/config.toml` or project `.codex/config.toml`;
- call app-server APIs;
- call Graphify or generate graph artifacts;
- inspect live Graphify state;
- start or depend on Graphify MCP, watch mode, hooks, or global graph state;
- inspect Workspace Session artifacts unless they are explicitly copied into
  the submitted JSON fixture;
- discover filesystem/config state beyond the declared input JSON;
- write files or mutate runtime state;
- authorize writes;
- activate live adapters;
- replace Evidence Gate v1, Grant Guard, Self-Improve invariants,
  install/refresh checks, or `npm ci && npm run quality`.

### CAP-VER-002: Matching Semantics

Matching MUST be exact and case-sensitive on `request.id`.

The verifier MUST NOT use aliases, tags, descriptions, group fallback, provider
fallback, lowercasing, trimming, fuzzy matching, semantic matching, local
config, or customization state to grant capability compatibility.

Requested `writes` and `outputs` MUST be exact declared subset checks. No glob,
prefix, or path-containment rule may be inferred.

`requiresGrant: true` MUST produce advisory output only. Grant Guard remains the
write authority.

### CODEX-001: Codex Config Boundary

Codex configuration is local operator context only.

`~/.codex/config.toml`, trusted-project `.codex/config.toml`, feature flags,
hooks, model settings, sandbox settings, and telemetry settings MAY inform an
operator that a local affordance exists. They MUST NOT become required evidence,
project state, write authority, refresh authority, Workspace authority, or
Capability Verifier input.

Codex hooks are optional and feature-gated. They MUST NOT be treated as
approval, execution evidence, refresh evidence, or Workspace command behavior.

### GRAPH-001: Graphify Evidence Boundary

Graphify MAY provide advisory repository graph evidence only through explicit,
repository-contained artifacts.

Allowed evidence examples:

- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`
- Workspace Repo Intake copies or hashes of existing graph artifacts

Forbidden verifier dependencies:

- live Graphify execution;
- Graphify MCP server activation;
- Graphify watch mode;
- Graphify hooks;
- global graph registry;
- Graphify cache or manifest state as authority;
- automatic graph regeneration;
- side effects outside `graphify-out/`.

Graphify command docs describe useful operator workflows, including MCP,
watching, hooks, and committed `graphify-out/` outputs. This specification
allows only static artifact evidence unless a later Workspace feature explicitly
changes the trust model with tests and Party Mode consensus.

### SI-001: Self-Improve Consumption Boundary

Self-Improve MAY use a Capability Verification verdict as planning evidence
that a requested capability id is declared with compatible fields.

Self-Improve MUST NOT treat `ok: true` as:

- runtime availability;
- write authorization;
- continuation permission;
- install readiness;
- refresh success;
- Evidence Gate pass state;
- quality gate success;
- permission to push;
- permission to weaken policy invariants.

If customization matters to a Self-Improve run, the run MUST record
`bmad-customize` output and resolver evidence separately from Capability
Verification.

### REVIEW-001: Release And Review Guard

Workspace release and review checklists MUST include a manual guard that:

- verifier behavior remains self-contained JSON-only;
- capability evidence does not depend on forbidden runtime/config/live sources;
- per-skill behavior changes have `bmad-customize` plus resolver evidence when
  relevant;
- central config generation remains outside `bmad-customize` v1.

## Acceptance Criteria

### P0: Squash Scope

- Capability Request template verifies as valid JSON fixture.
- `verifyCapabilityRequest` validates embedded declarations before matching.
- Missing, malformed, duplicate, contradictory, or unsupported declarations
  fail with clear errors.
- Verifier success means declared-contract compatibility only.
- Verifier isolation is covered by tests and review checklist text.
- `bmad-customize` source guidance states authoring/education only for
  Capability Verification.
- Per-skill behavior customization guidance points to `customize.toml` surfaces
  and resolver evidence, not verifier inputs.
- Central config generation is explicitly out of scope for `bmad-customize` v1.
- Central config roster effects are distinguished from internal skill behavior.
- Codex config and hooks are documented as local operator affordances only.
- Graphify evidence is limited to static repository-contained artifacts.

### P1: Follow-Up Scope

- `bmad-customize` discovery finds nested BMM skill roots without requiring
  users to pass every phase directory manually.
- Shared planning capability prose is generated from or checked against
  `tools/bmad-planning-capabilities.json` to reduce copy drift.
- Review Manifest or release review guidance can flag hand-authored per-skill
  TOML and recommend `bmad-customize` plus resolver evidence.

### P2: Future Scope

- Safe `customize.toml` surfaces for core operator skills may be added only
  through a separate specification and tests.
- Central config authoring may be revisited only as a separate capability, not
  as `bmad-customize` v1 behavior.
- Richer authoring helpers may scaffold JSON fixtures, but Workspace verifier
  isolation must remain unchanged.

## TDD Specification

First failing public behavior test:

`verifyCapabilityRequest` rejects malformed or unsafe embedded capability
declarations before matching, while still accepting the canonical Capability
Request template.

The failing test MUST exercise public behavior: submitted JSON in, verdict JSON
out, no filesystem/config discovery, no side effects, and clear errors for
forbidden runtime/config/live dependencies.

Smallest green change:

Validate each `capabilities[]` declaration with the existing Workspace
Capability Contract declaration rules before exact-id matching. Keep the
verifier free of filesystem discovery, TOML parsing, network calls, app-server
calls, and Graphify calls.

Refactor after green:

Extract declaration-validation and verifier-boundary constants only after
targeted tests pass.

Targeted validation:

```bash
npm run test:workspace
python3 src/core-skills/bmad-customize/scripts/tests/test_list_customizable_skills.py
npm run validate:skills
```

Full gate before push:

```bash
npm ci
npm run quality
```

## Required Tests

- Valid Capability Request template passes.
- Capability Request rejects case-mismatched IDs.
- Capability Request rejects duplicate declarations.
- Capability Request rejects unknown top-level request fields.
- Capability Request rejects missing declaration fields.
- Capability Request rejects declaration type mismatches.
- Capability Request rejects engine-like declarations that lack required
  upstream-gap proof.
- Capability Request rejects incompatible session type, group, provider,
  interface, writes, and outputs.
- Verifier implementation and CLI wrapper tests assert no dependency on
  `_bmad/custom`, `customize.toml`, child processes, HTTP(S), Graphify builders,
  Codex config, app-server calls, or Workspace Session artifacts.
- Verifier tests assert JSON-only response, read-only behavior, no side effects,
  and rejection of forbidden external dependency references.
- `bmad-customize` source skill includes Capability Verification Authoring
  guidance, template path, forbidden verifier sources, and central config
  out-of-scope language.
- BMad customization docs/spec tests distinguish per-skill recipes from central
  config roster recipes.
- Codex config boundary tests/docs assert `~/.codex/config.toml`, project
  `.codex/config.toml`, feature flags, and hooks are operator affordances only.
- Graphify boundary tests/docs assert static `graphify-out/` artifacts are
  advisory evidence and live Graphify/MCP/watch/hooks are not verifier inputs.
- Release checklist includes verifier isolation and `bmad-customize` boundary
  guards.
- Customize discovery has regression coverage for nested skill roots as P1
  follow-up.

## Per-Commit Squash Disposition

| Commit | Subject | Squash disposition |
| --- | --- | --- |
| `5b0c66f5b` | Implement BMAD prompt builder | Reverted later. If revived, prompt/template authoring must route through explicit customize surfaces, not TOML snippets. |
| `6223d81c0` | Merge branch `main` | Merge-only. No spec impact. |
| `1f74a17c1` | Refresh BMAD workspace state | Coordination evidence only. No Customize runtime role. |
| `b50f9fee8` | Add Workspace distro artifacts | Docs boundary: explain behavior customization through `bmad-customize`, not hand-authored TOML. |
| `6922602f0` | Merge branch `main` | Merge-only. No spec impact. |
| `028c9c671` | Add Workspace distro v1 backlog | Backlog should include Customize boundary as acceptance criterion. |
| `378ea4024` | wip | Coordination-only. Squash away. |
| `6ad93e44a` | Add Workspace contract validation | Contract validation stays artifact/schema-owned, not TOML-owned. |
| `36127a8e3` | Mark S1 complete | Traceability only. |
| `154778903` | Add Workspace CLI help | CLI help must not imply Workspace reads `_bmad/custom`. |
| `fdcee942d` | Mark S2 complete | Traceability only. |
| `ada39dd0d` | Add Workspace launch | Launch authority stays CLI/grant-driven, not customization-driven. |
| `9069f9611` | Mark S3 complete | Traceability only. |
| `49d408082` | Fix evidence hashes | Evidence hash correction only. |
| `0456fc556` | Add Repo Intake | Intake records source/provenance; no customization config. |
| `7dff286d3` | Mark S5 complete | Traceability only. |
| `a11c93a2b` | Add packet freshness guard | Freshness guard validates intake refs, not custom TOML recency. |
| `53d884b3b` | Mark S6 complete | Traceability only. |
| `20bc4d188` | Add mission packet builder | Packet builder consumes explicit goal/setup refs, not `_bmad/custom`. |
| `b0196a995` | Mark S7 complete | Traceability only. |
| `5301a6a59` | Add worktree review | Review may flag custom TOML, but must not author or infer from it. |
| `f104e5850` | Mark S8 complete | Traceability only. |
| `d66731944` | Add destroy | Destroy must not touch `_bmad/custom`. |
| `5d97fc107` | Mark S9 complete | Traceability only. |
| `58a900bff` | Add grant guard denial | Grant Guard decides write authority, not customization merge. |
| `c20d1599d` | Mark S10 complete | Traceability only. |
| `b042d39e9` | Add base improvement launch | Base writes remain grant-governed; behavior overrides are separate evidence. |
| `801f93ba4` | Mark S11 complete | Traceability only. |
| `ff91dfed4` | Cover multi-repo launch | Test CLI behavior only; no customization inference. |
| `70434058c` | Mark S4 complete | Traceability only. |
| `d9ddc3da8` | wip | Coordination-only. Squash away. |
| `483f10fca` | Add v2 session packet kit | Templates should link to Customize for behavior changes, not embed TOML examples. |
| `d3a1554d5` | wip | Coordination-only. Squash away. |
| `292d1c160` | Remove distro naming | Rename keeps Workspace/Customize boundary unchanged. |
| `a1c161dfb` | Add v4 session setup gate | Setup capabilities are not customization surfaces; record Customize evidence separately if needed. |
| `e3f5ac0e8` | wip | Coordination-only. Squash away. |
| `e5f8840fe` | Add v5 status inspectability | Status reads stored artifacts only; no `_bmad/custom` blocker. |
| `1a7030be0` | Add v6 inventory handoff | Handoff may mention overrides as operator context, not authority. |
| `021357759` | Add v7 session archives | Archives are evidence bundles, not restore/config inputs. |
| `e9466b79d` | wip | Coordination-only. Squash away. |
| `4f4e3136b` | Add v8 routing contract | Routing selects workflow catalog entries, not override state. |
| `c1fbfb608` | Add v9 result ledger | Results record manual facts; customization proof should be resolver evidence. |
| `f752cbf54` | Record session state | Coordination-only. Squash away or retain as evidence outside product spec. |
| `0ba3af07a` | Add manual executor contract | Executor Contract is manual readiness, not runtime permission or customization. |
| `5781270d5` | Add v11 closeout plan | Closeout may record follow-up; no raw TOML prescription. |
| `4527d1703` | Add manual closeout | Closeout outcome cannot imply override applied without resolver evidence. |
| `7cf850570` | Add v13 release readiness | Release checklist should add verifier/customize boundary guard. |
| `7e12e2d6b` | Add evidence index trust layer | Evidence Index reads session artifacts; no default `_bmad/custom` crawl. |
| `b6a70b10f` | Add read-only archive diff | Diff compares verified archives only. |
| `01546d281` | Add v16 review manifest | Review Manifest can flag hand-authored TOML and prefer Customize evidence. |
| `f7ccf10a3` | Record v16 coordination state | Coordination-only. Squash away or retain as evidence outside product spec. |
| `65bef3890` | Consolidate Workspace docs | Consolidated docs should centralize Customize/verifier boundary. |
| `e58ec30c2` | Plan Codex affordances | Codex config is advisory operator context, not Workspace or Customize authority. |
| `28377c5f2` | Quarantine release labels | History hygiene only. |
| `0c04c9eec` | Compile history BMADs | Historical archive only; not current customization guidance. |
| `14bd6c99b` | Reject legacy artifacts | Legacy rejection remains schema/contract-owned, not override-owned. |
| `fdec3618f` | Compile strict reject history | Historical archive only. |
| `77d368051` | Remove archive compatibility surface | Strict archive contract reduces accidental config interpretation. |
| `4d742960a` | Compile archive cleanup history | Historical archive only. |
| `977f9b967` | Revert prompt builder skill | Correctly removes second authoring path that could bypass Customize. |
| `15c620e23` | Compile prompt builder removal history | Historical archive only. |
| `82cd68406` | Harden release safety gates | Add explicit no custom-TOML verifier dependency guard. |
| `385540243` | Compile release hardening history | Historical archive only. |
| `12ab0d209` | Add Codex self-improvement workflow | Self-Improve invokes Customize only for behavior overrides; policy invariants stay source/test-owned. |
| `15759a925` | Add self-improve operator runbook | Runbook should route behavior overrides to Customize and record resolver evidence. |
| `5bbd34cd4` | Preserve pre-automation worktree state | Dirty preservation is git policy; custom TOML is user work unless explicitly in scope. |
| `7b99f6d4c` | Harden dirty worktree preflight | Safety invariant; no Customize leverage. |
| `d2ce4e38b` | Add Activation State evidence contract | Activation State cannot use raw TOML as proof. |
| `ea35a12be` | Cover self-improve invariants | Future invariant: hand-authored TOML alone cannot satisfy behavior/capability gates. |
| `abe53ebcd` | Add Party Mode self-improve checks | Party Mode should challenge TOML hand edits and route to Customize. |
| `393de54ec` | Update Hermes coordination state | Coordination-only. Squash away or retain as evidence outside product spec. |
| `26352a091` | Add self-improve capability invariants | Capability declarations are data contracts, not TOML surfaces. |
| `ac8d08b97` | Expose planning capabilities across BMAD | Planning capabilities may recommend Customize; registry stays separate. |
| `2def0a68a` | Validate resume checkpoint evidence | Resume validation accepts explicit resolver evidence, not raw TOML presence. |
| `a1772fcdd` | Harden resume evidence gates | Continuation gates remain explicit evidence checks. |
| `ce0403ada` | Clarify Codex advanced config boundaries | Pair with BMad guidance: use Customize for BMad behavior, not Codex TOML. |
| `54fd60edc` | Add repository graph pipeline | Graph pipeline is artifact pipeline, not customization input. |
| `2de68fbe8` | Add Graphify graph evidence intake | Intake records existing graph artifacts; no live Graphify or TOML hydration. |
| `2de09c795` | Add Evidence Gate v1 packets | Gates depend on packet refs/capability IDs, not customization TOML. |
| `a367eb642` | Block unknown advisory routes | Strict catalog rejection, not customization merge. |
| `ed885f804` | Cover fuzzy advisory route rejection | Test-only; no Customize leverage. |
| `55e3b0a9e` | Map validator owner review gates | Add reviewer guard against hand-authored TOML when Customize can author/verify. |
| `cdfdb600e` | Add capability verifier | Best P0 target: JSON-only verifier, template guidance, stronger declaration validation, and config-blind tests. |

## Complete When

- The P0 acceptance criteria are implemented or explicitly deferred.
- Targeted tests pass.
- `npm ci && npm run quality` passes on the exact checkout intended for push.
- Any per-skill behavior customization has resolver evidence.
- Any deferred P1/P2 item is recorded as future work, not implied v1 behavior.
