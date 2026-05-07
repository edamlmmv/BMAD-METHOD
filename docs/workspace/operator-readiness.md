---
title: "BMAD Workspace Operator Readiness"
description: Non-authoritative operator runbook for closing readiness gaps
---

# BMAD Workspace Operator Readiness

This non-authoritative runbook closes the readiness UX gap for a BMAD Operator.
Authority remains the existing Workspace contract docs and release rules only.
Committed fixtures/manifests are evidence inputs, not authority.

## Operator Goal

Use this when onboarding to the repo or reviewing release readiness. The job is
to verify Workspace readiness without changing TOML, public CLI/API/schema,
verifier behavior, or Graphify behavior.

## First 10 Minutes

1. Confirm the checkout and current commit.
2. Read the current Workspace contract docs: Product Requirements,
   Architecture, Command Contract, Capability Contract, Guardrails, Operator
   Quickstart, Operator Guide, and Release Checklist.
3. Inspect capability examples before claiming capability readiness.
4. Confirm checked-in Graphify graph evidence is present and validated.
5. Confirm TOML/customize guidance does not imply verifier, grant, runtime, or
   hidden-execution authority.
6. Stop before public CLI/API/schema, TOML, verifier, or Graphify behavior
   changes unless a separate implementation plan and red test exist.

## Readiness Checklist

- `AC-OPR-01`: PASS when this one-page runbook exists and is clearly
  non-authoritative.
- `AC-OPR-02`: PASS when Workspace index, Operator Quickstart, and Release
  Checklist link this runbook as readiness-gap closure.
- `AC-OPR-03`: PASS when `bmad workspace verify-capability` is treated as a
  declared-contract check over self-contained Capability Request JSON only.
- `AC-OPR-04`: PASS when checked-in `graph/*.graph.json` and
  `npm run validate:graphify-manifests` are treated as advisory evidence only.
  Graphify may inform readiness, but it never gates readiness, mutates
  manifests, or becomes authority unless an existing Workspace contract
  explicitly says so.
- `AC-OPR-05`: PASS when TOML/customize is limited to exposed skill behavior.
  There is no TOML mutation by default. _bmad/custom is not verifier input,
  grant authority, runtime authority, or hidden-execution authority.
- `AC-OPR-06`: PASS when compiled history records the readiness closure
  candidate and preserves the current count convention.
- `AC-OPR-07`: PASS when push readiness still requires
  `npm ci && npm run quality` on exact `HEAD`.

If any checklist item fails, the operator can decide readiness is blocked
without asking a maintainer.

## Evidence Sources

- Authority docs: `docs/workspace/prd.md`, `architecture.md`,
  `command-contract.md`, `capability-contract.md`, `guardrails.md`,
  `operator-quickstart.md`, `operator-guide.md`, and `release-checklist.md`.
- Capability fixtures:
  `docs/workspace/templates/capability-request.codex-manual.example.json` and
  `docs/workspace/templates/capability-request.graphify-repo-intake.example.json`.
- Graphify evidence inputs: checked-in `graph/*.graph.json` files and
  `npm run validate:graphify-manifests`.
- Skill validation evidence: `tools/skill-validator.md` plus
  `npm run validate:skills`.

## Not Authority

- This `operator-readiness.md` file.
- Compiled history prose.
- Live or advisory Graphify output.
- `_bmad/custom` for verifier, grant, runtime, or hidden-execution authority.
- Codex config.
- Workspace Session artifacts.

## Boundaries

- No public CLI/API/schema change.
- No TOML files/behavior change.
- No Graphify behavior change.
- No verifier behavior change.
- No scheduler, watcher, replay, restore, merge, promotion, or live adapter.

## Push Gate

Before push, run this on the exact checkout and `HEAD` being pushed:

```bash
npm ci && npm run quality
```
