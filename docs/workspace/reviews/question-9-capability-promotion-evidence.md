---
title: "Question 9: Capability Promotion And Minimum Evidence"
description: "Spec-shaped BMAD answer for promoting, demoting, repairing, and testing supported capabilities without weakening Workspace trust boundaries"
---

# Question 9: Capability Promotion And Minimum Evidence

## Question

How should BMAD decide that a capability is actually supported, and how should
it promote, demote, or repair capability support without letting local runtime
state or verifier output become too powerful?

## Decision

BMAD SHOULD treat support promotion as an evidence-backed registry and contract
change, not as a verifier side effect.

`bmad workspace verify-capability` answers one narrow question:

> Does this self-contained Capability Request JSON match an embedded declared
> capability by exact id and declared constraints?

It does not answer:

- is the capability installed here;
- is the capability healthy;
- is the capability approved;
- is the capability supported across BMAD;
- should the registry state change;
- should Workspace promote a target repo or base change.

Final rule:

> A capability becomes supported only through committed evidence, deterministic
> tests, explicit review, and a registry or contract update. Verifier success is
> one evidence item, never the promotion decision.

## Boundary Clarification

This document uses "support promotion" to mean:

> moving a capability, variant, or registry entry toward a supported lifecycle
> state.

It does not mean Workspace target repo promotion, base improvement promotion,
merge, apply, restore, replay, or automatic action. Those remain manual-only and
outside `verify-capability`.

## Ubiquitous Language

| Term | Meaning |
| --- | --- |
| Support Promotion | Evidence-backed change that marks a capability or variant as supported, valid, or accepted in the Capability Registry or Capability Contract. |
| Support Demotion | Evidence-backed change that marks a capability or variant as invalid, stale, deprecated, removed, blocked, or needs repair. |
| Evidence Package | Committed set of declaration, fixtures, tests, docs, review notes, and quality output needed to justify support state. |
| Validator Owner | Deterministic command or manual review owner responsible for checking one trust claim. |
| Positive Fixture | Capability Request or behavior fixture proving an allowed path works. |
| Negative Fixture | Fixture proving forbidden, mismatched, stale, missing, or unsafe paths fail closed. |
| Boundary Test | Test proving forbidden inputs do not affect trust or authority. |
| Repair Plan | Stable issue, story, doc path, or TODO describing how invalid support can become valid. |
| Promotion Decision | Human or review-recorded conclusion that evidence is sufficient to update support state. |
| Demotion Trigger | Failing evidence, stale dependency, broken validator, bad declaration, policy violation, or unsupported runtime drift. |

## Minimum Evidence Package

A capability or variant MUST NOT be marked supported unless the evidence package
contains all required evidence for its risk class.

P0 minimum evidence for any supported capability:

| Evidence | Required Content | Why |
| --- | --- | --- |
| Capability Declaration | Exact id, group, provider, interface, allowed sessions, `requiresGrant`, writes, forbidden writes, outputs, and upstream-gap flag. | Defines the contract BMAD owns. |
| Positive Capability Fixture | A self-contained Capability Request JSON that returns `ok: true`. | Proves declared compatibility by public verifier behavior. |
| Negative Capability Fixtures | At least missing declaration, mismatched interface or provider, forbidden write, and undeclared output. | Proves the verifier fails closed. |
| Boundary Tests | Tests or review checks proving `_bmad/custom`, Codex config, live Graphify, app-server APIs, Workspace Session artifacts, and runtime availability do not affect verifier trust. | Preserves Q7 boundary. |
| Public Behavior Tests | CLI-level or module-level tests for the actual Workspace behavior or adapter contract being claimed. | Prevents paper declarations from masquerading as support. |
| Documentation | Capability purpose, allowed outputs, forbidden actions, grant behavior, runtime boundary, and repair guidance. | Makes operator use legible. |
| Validator Owner | Named deterministic command or manual-review note for each trust claim. | Keeps future drift visible. |
| Quality Evidence | `npm ci && npm run quality` on the exact checkout before push. | Proves the repository-wide gate passed. |

Support promotion MAY add optional runtime smoke evidence, but runtime smoke
evidence MUST NOT replace deterministic tests.

## Capability-Specific Evidence

### Graphify Capabilities

Graphify support evidence SHOULD include:

- static repository-contained graph artifacts when graph evidence is part of the
  support claim;
- `npm run validate:graphify-manifests` when manifests are touched;
- positive and negative tests for missing, stale, invalid, or provenance-free
  graph artifacts when graph evidence gates are in scope;
- docs stating that live Graphify MCP, watch mode, hooks, cache state, and graph
  regeneration are operator affordances or repair aids, not verifier inputs.

Graphify support evidence MUST NOT come from live MCP responses, watch output,
uncommitted cache state, or ad hoc regeneration during verification.

### Codex Capabilities

Codex support evidence SHOULD include:

- declared `executor.codex.manual` or operator-affordance capability fixtures;
- docs stating that Codex config, hooks, plugins, profiles, and subagents are
  operator affordances only;
- boundary tests proving `~/.codex/config.toml` and project `.codex/config.toml`
  do not affect deterministic verifier output;
- Grant Guard evidence when durable writes are involved.

Codex support evidence MUST NOT come from local user config, app-server runtime
state, enabled hooks, current model choice, or available subagent count.

### BMad Customize Capabilities

BMad Customize support evidence SHOULD include:

- source skill guidance that points users to exposed `customize.toml` surfaces;
- resolver evidence when a per-skill behavior change is part of the claim;
- tests proving Customize does not make Workspace verifier read `_bmad/custom`;
- docs explaining that resolver evidence is review context, not Capability
  Request evidence.

BMad Customize MUST NOT be used to promote a capability by hand-authoring TOML
or by making verifier trust depend on customization state.

## Support State Transitions

Recommended support-state transitions:

```text
proposed -> experimental -> supported
proposed -> needs-repair
experimental -> supported
supported -> stale
supported -> deprecated
supported -> invalid
deprecated -> removed
invalid -> needs-repair -> experimental
invalid -> removed
```

Transition rules:

- `proposed` means BMAD has an idea or candidate capability, not support.
- `experimental` means exploration is allowed, but support evidence is
  incomplete.
- `supported` means the minimum evidence package is complete.
- `stale` means once-valid evidence may no longer be current.
- `deprecated` means a better exact id exists or support is intentionally
  winding down.
- `invalid` means evidence failed or the capability claim is unsafe.
- `needs-repair` means the repair path is known.
- `removed` means the capability should not be offered as a supported request
  target.

Support promotion requires a committed diff. Support demotion also requires a
committed diff unless the status is only a local advisory observation.

## Promotion Rules

A capability MAY be promoted to `supported` only when:

- the exact declaration is present in the Capability Contract or explicit
  registry snapshot;
- positive and negative fixtures exist;
- boundary tests exist for forbidden trust inputs;
- capability-specific validators pass;
- docs state runtime and authority boundaries;
- a validator owner is named;
- release quality passes on the exact checkout;
- review records any manual judgment that deterministic tests cannot cover.

A capability MUST NOT be promoted by:

- `ok: true` alone;
- Graphify graph freshness alone;
- Codex config availability;
- runtime smoke success alone;
- BMad Customize resolver output alone;
- Review Manifest `decision.status: ready`;
- Result Ledger outcome alone;
- Closeout outcome alone;
- local user acceptance alone;
- uncommitted artifacts.

## Demotion Rules

A capability SHOULD be demoted when:

- positive fixtures fail;
- negative fixtures stop failing closed;
- boundary tests show forbidden input affects trust;
- docs and implementation drift;
- a validator owner is missing or broken;
- Graphify evidence becomes missing, stale, invalid, or provenance-free for a
  graph-dependent claim;
- Codex docs or runtime assumptions become unsupported by committed evidence;
- a safer replacement id exists;
- upstream-gap proof becomes missing for engine-like adapters.

Demotion MUST preserve repair visibility. Do not just delete the claim when a
known operator need remains. Prefer:

- `lifecycleState: invalid`;
- `lifecycleState: stale`;
- `lifecycleState: needs-repair`;
- `replacedBy`;
- `repairRef`;
- failing fixture or manual review note.

## Evidence Owners

Recommended owner map:

| Claim | Validator Owner |
| --- | --- |
| Capability verifier exact match and failure modes | `npm run test:workspace` |
| Workspace command and docs parity | `npm run test:workspace` plus command registry checks |
| Static Graphify manifest support | `npm run validate:graphify-manifests` |
| Skill surface validity | `npm run validate:skills` |
| File reference integrity | `npm run validate:refs` |
| Planning capability registry | `npm run validate:bmad-planning-capabilities` |
| Self-Improve invariants | `npm run validate:self-improve-invariants` |
| Full release state | `npm ci && npm run quality` |

Manual review notes are allowed only when the claim cannot be fully tested.
Manual review notes MUST describe what was inspected and what deterministic
test should be added if the claim becomes recurring.

## Example: Promote Graphify Static Repo Intake

Support claim:

> `evidence.graph.repo-intake.graphify-v7-static` is a supported Graphify
> variant for static Repo Intake graph evidence.

Minimum evidence:

```text
Declaration:
  exact capability id with provider graphify and interface repo-intake

Positive fixture:
  matching Capability Request returns ok: true

Negative fixtures:
  parent/family id does not match variant id
  forbidden workspace-base write fails
  undeclared graph output fails
  missing declaration fails

Boundary tests:
  live Graphify MCP not read
  watch/cache state not read
  _bmad/custom not read
  Codex config not read

Graph evidence:
  validate graph manifests when graph artifacts are changed

Docs:
  static graph artifacts are advisory evidence
  source files remain authority
  live Graphify is runtime affordance only

Gate:
  npm ci
  npm run quality
```

## Example: Demote Codex Hook Capability

Support claim:

> `operator.codex.affordance.hooks` is no longer supported as a deterministic
> capability because hook availability is local, feature-gated, and not
> Workspace authority.

Demotion evidence:

```text
Lifecycle state:
  deprecated or invalid

Reason:
  Hook presence cannot be deterministic Workspace evidence.

Replacement:
  operator.codex.affordance.manual-context

Boundary:
  Codex hooks may remain operator affordances.
  They must not authorize execution, approval, refresh, verifier trust, or
  Workspace mutation.

Repair:
  Add future deterministic hook capability only if committed fixtures and tests
  prove it is advisory-only.
```

## Acceptance Criteria

1. Support promotion is documented as a registry or contract change, not a
   verifier side effect.

2. Minimum evidence includes tests. At least one positive fixture, multiple
   negative fixtures, and boundary tests are required for supported
   capabilities.

3. `ok: true` from `verify-capability` is one evidence item only and cannot
   promote support state.

4. Runtime availability, Graphify live state, Codex config, BMad Customize
   resolver output, Result Ledger entries, Review Manifest decisions, and
   Closeout outcomes cannot promote support state by themselves.

5. Demotion preserves repair visibility through lifecycle state, reason,
   `repairRef`, failing fixture, manual review note, or replacement id.

6. Graphify support claims distinguish static committed artifacts from live MCP,
   watch, hook, cache, and regeneration surfaces.

7. Codex support claims distinguish operator affordance from Workspace authority.

8. BMad Customize support claims distinguish resolver evidence from Capability
   Request evidence.

9. Every recurring trust claim has a validator owner or an explicit manual
   review note.

10. Full release promotion requires `npm ci && npm run quality` on the exact
    checkout intended for push.

## Test Examples

### CAP-Q9-001: Supported Capability Requires Positive And Negative Evidence

```js
it("rejects support promotion when verifier failure fixtures are missing", () => {
  const promotion = {
    capabilityId: "evidence.graph.repo-intake.graphify-v7-static",
    lifecycleState: "supported",
    evidence: {
      positiveFixtures: ["fixtures/graphify-static.ok.json"],
      negativeFixtures: [],
      boundaryTests: ["test/workspace-capability-boundary.test.js"],
      docsRefs: ["docs/workspace/capability-contract.md"],
      validatorOwners: ["npm run test:workspace"]
    }
  };

  const verdict = validateSupportPromotionEvidence(promotion);

  expect(verdict.ok).toBe(false);
  expect(verdict.errors).toContainEqual(
    expect.objectContaining({ code: "SUPPORT_NEGATIVE_FIXTURES_MISSING" })
  );
});
```

### CAP-Q9-002: Runtime Smoke Alone Cannot Promote Support

```js
it("rejects support promotion backed only by runtime availability", () => {
  const promotion = {
    capabilityId: "operator.codex.affordance.hooks",
    lifecycleState: "supported",
    evidence: {
      runtimeSmoke: ["Codex hooks enabled locally"],
      positiveFixtures: [],
      negativeFixtures: [],
      boundaryTests: [],
      validatorOwners: []
    }
  };

  const verdict = validateSupportPromotionEvidence(promotion);

  expect(verdict.ok).toBe(false);
  expect(verdict.errors).toContainEqual(
    expect.objectContaining({ code: "SUPPORT_DETERMINISTIC_EVIDENCE_MISSING" })
  );
});
```

### CAP-Q9-003: Demotion Keeps Repair Path Visible

```js
it("requires a repair path or replacement when demoting a known capability", () => {
  const demotion = {
    capabilityId: "evidence.graph.repo-intake.live-mcp",
    lifecycleState: "invalid",
    reason: "Live Graphify MCP cannot be verifier trust evidence.",
    repairRef: null,
    replacedBy: null
  };

  const verdict = validateSupportDemotionEvidence(demotion);

  expect(verdict.ok).toBe(false);
  expect(verdict.errors).toContainEqual(
    expect.objectContaining({ code: "SUPPORT_REPAIR_PATH_MISSING" })
  );
});
```

## Red Green Refactor

Red:

- Add a public support-promotion evidence test proving a capability cannot be
  marked supported without negative fixtures and boundary tests.

Green:

- Add only the smallest registry or review validation needed to check evidence
  completeness.
- Keep `verify-capability` unchanged.

Refactor:

- Extract reusable evidence package terms after tests pass.
- Generate docs tables from registry data only if the registry is committed and
  deterministic.

Targeted validation:

```bash
bmad workspace verify-capability --input docs/workspace/templates/capability-request.template.json
npm run test:workspace
npm run validate:graphify-manifests
npm run validate:skills
```

Full gate before push:

```bash
npm ci
npm run quality
```

