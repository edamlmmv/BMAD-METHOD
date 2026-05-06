---
title: "BMad Customize Architecture Corrections"
description: "Architecture corrections for BMad Customize leverage on codex/self-improve-capability-evidence-gates"
---

# BMad Customize Architecture Corrections

Review date: 2026-05-05
Branch reviewed: `codex/self-improve-capability-evidence-gates`
Base: `main`
Commit range: `main..codex/self-improve-capability-evidence-gates`

## Scope

This note reviews each commit in the branch and asks one narrow question:
could `bmad-customize` improve this commit or a follow-up to this commit so
operators avoid hand-authoring TOML?

No commit in the reviewed range adds a `.toml` file, an `_bmad/custom/*`
override, or a `customize.toml` surface. The strongest correction is therefore
architectural: keep Workspace runtime verifiers independent from customization
state, but give `bmad-customize` real authoring surfaces for the operator-facing
configuration and request fixtures around Workspace and Self-Improve.

## Zoom-Out Map

- `tools/workspace/*`: Workspace runtime and artifact contract implementation.
- `tools/installer/commands/workspace.js`: CLI command entrypoint and command routing.
- `src/core-skills/bmad-workspace/SKILL.md`: operator workflow contract for Workspace.
- `src/core-skills/bmad-self-improve/SKILL.md`: local Codex self-improvement runbook and policy consumer.
- `src/core-skills/bmad-help/SKILL.md`: catalog-driven orientation and routing.
- `src/core-skills/bmad-party-mode/SKILL.md`: multi-voice planning and critique contract.
- `src/core-skills/bmad-customize/SKILL.md`: guided authoring surface for per-skill overrides; currently no runtime verifier input.
- `tools/bmad-planning-capabilities.json`: shared planning capability registry.
- `tools/workspace/capability-contract.js` and `tools/workspace/capability-verifier.js`: declared capability contract and verifier.
- `docs/workspace/*`: Workspace current docs, templates, historical delivery records, and operator guidance.

## Architecture Corrections For Future Task

1. Add a `bmad-customize` authoring mode for Workspace Capability Request JSON.

   Keep `bmad workspace verify-capability` independent from `_bmad/custom`.
   Do not make the verifier read TOML. Instead, make `bmad-customize` guide the
   operator through `docs/workspace/templates/capability-request.template.json`,
   explain fields, produce a self-contained request fixture, run
   `bmad workspace verify-capability --input <fixture>`, and report the verdict.
   This avoids hand-authored JSON/TOML while preserving the declared-contract
   boundary introduced in `cdfdb600e`.

2. Expose conservative `customize.toml` surfaces for core operator skills.

   `bmad-workspace`, `bmad-self-improve`, `bmad-help`, `bmad-party-mode`, and
   `bmad-customize` currently have no `customize.toml`, so `bmad-customize`
   cannot route safe per-skill behavior changes for the very skills added in
   this branch. Future surface should be append-only and safe:
   `activation_steps_prepend`, `activation_steps_append`, `persistent_facts`,
   and template path scalars where templates already exist. Do not expose
   fields that can weaken Self-Improve invariants, Workspace grant boundaries,
   evidence gates, release quality, or no-push/no-hidden-execution rules.

3. Fix customizable-skill discovery for nested BMM roots.

   Running the current discovery script with `--extra-root src/bmm-skills`
   returns no customizable skills because BMM skills are nested under phase
   directories. Future task should make discovery read the installed manifest or
   recurse one level below phase folders, then add a regression test. Otherwise
   operators are pushed back toward manual path discovery and hand-authored TOML.

4. Treat shared planning capabilities as generated surface, not copied prose.

   `tools/bmad-planning-capabilities.json` is good, but the branch still copies
   capability prose into multiple skills and docs, then validates string anchors.
   Future task should generate or partially render the capability tables from
   the registry, or give `bmad-customize` a recipe that updates the registry plus
   required surfaces together. This reduces drift and avoids manual edits across
   Help, Workspace, Self-Improve, Party Mode, prompts, and checkpoint templates.

5. Keep central config out of `bmad-customize` v1, but make the boundary explicit in review recipes.

   Several reviewed commits touch cross-cutting rosters, capability declarations,
   and operator affordance docs. Those are central/config-like concerns, but
   `bmad-customize` v1 explicitly does not author `_bmad/custom/config.toml`.
   Future task should add a "central config out of scope" decision path inside
   the review recipe: explain why no per-skill override applies, point to
   Workspace Capability Contract docs or customization docs, and avoid inventing
   TOML fields.

## Per-Commit Review Matrix

| # | Commit | Subject | `bmad-customize` leverage | Future correction |
| ---: | --- | --- | --- | --- |
| 1 | `5b0c66f5b` | Implement BMAD prompt builder | Maybe | If prompt builder ever returns, add `customize.toml` for prompt templates/output paths so operators do not edit skill text or central TOML. |
| 2 | `6223d81c0` | Merge branch 'main' from GitHub remote | No | Merge-only commit; no customize action. |
| 3 | `1f74a17c1` | chore: refresh BMAD workspace state | No | Coordination state only; no customize action. |
| 4 | `b50f9fee8` | docs: add BMAD workspace distro artifacts | Maybe | Workspace docs introduce operator conventions; later expose stable operator facts through `bmad-workspace` `persistent_facts` instead of manual skill edits. |
| 5 | `6922602f0` | Merge branch 'main' from GitHub remote | No | Merge-only commit; no customize action. |
| 6 | `028c9c671` | docs: add workspace distro v1 backlog | Maybe | Backlog could include explicit customize surface requirements for Workspace from start. |
| 7 | `378ea4024` | wip | No | Hermes/coordination only; no customize action. |
| 8 | `6ad93e44a` | feat: add workspace distro contract validation | Maybe | Contract validation should stay code-owned; add future checks that custom overrides cannot weaken contract text if core surfaces are added. |
| 9 | `36127a8e3` | docs: mark workspace distro S1 complete | No | Traceability-only commit; no customize action. |
| 10 | `154778903` | feat: add workspace distro CLI help | Maybe | CLI help text should remain generated/registered; `bmad-customize` can later guide operator-facing skill copy, not CLI command behavior. |
| 11 | `fdcee942d` | docs: mark workspace distro S2 complete | No | Traceability-only commit; no customize action. |
| 12 | `ada39dd0d` | feat: add workspace distro launch | No | Runtime launch path should not read customization overrides. |
| 13 | `9069f9611` | docs: mark workspace distro S3 complete | No | Traceability-only commit; no customize action. |
| 14 | `49d408082` | docs: fix workspace distro evidence hashes | No | Evidence hash correction; no customize action. |
| 15 | `0456fc556` | feat: add workspace distro repo intake | No | Repo Intake evidence should remain deterministic and not depend on `_bmad/custom`. |
| 16 | `7dff286d3` | docs: mark workspace distro S5 complete | No | Traceability-only commit; no customize action. |
| 17 | `a11c93a2b` | feat: add workspace distro packet freshness guard | No | Freshness guard should remain code-owned, not customizable. |
| 18 | `53d884b3b` | docs: mark workspace distro S6 complete | No | Traceability-only commit; no customize action. |
| 19 | `20bc4d188` | feat: add workspace distro mission packet builder | Maybe | Packet prompt wording could later use a `bmad-workspace` template scalar, but packet contract fields must stay non-customizable. |
| 20 | `b0196a995` | docs: mark workspace distro S7 complete | No | Traceability-only commit; no customize action. |
| 21 | `5301a6a59` | feat: add workspace distro worktree review | No | Review evidence should remain deterministic and independent from custom TOML. |
| 22 | `f104e5850` | docs: mark workspace distro S8 complete | No | Traceability-only commit; no customize action. |
| 23 | `d66731944` | feat: add workspace distro destroy | No | Destructive/runtime command guardrails should not be customized. |
| 24 | `5d97fc107` | docs: mark workspace distro S9 complete | No | Traceability-only commit; no customize action. |
| 25 | `58a900bff` | feat: add workspace distro grant guard denial | No | Grant denial must remain deterministic and not read `_bmad/custom`. |
| 26 | `c20d1599d` | docs: mark workspace distro S10 complete | No | Traceability-only commit; no customize action. |
| 27 | `b042d39e9` | feat: add workspace distro base improvement launch | No | Base Improvement grants should remain explicit artifacts, not customization state. |
| 28 | `801f93ba4` | docs: mark workspace distro S11 complete | No | Traceability-only commit; no customize action. |
| 29 | `ff91dfed4` | test: cover workspace distro multi repo launch | No | Test-only commit; no customize action. |
| 30 | `70434058c` | docs: mark workspace distro S4 complete | No | Traceability-only commit; no customize action. |
| 31 | `d9ddc3da8` | wip | No | Hermes/coordination only; no customize action. |
| 32 | `483f10fca` | feat(workspace-distro): add v2 session packet kit | Maybe | Session packet templates are good candidates for future `bmad-workspace` template path overrides, authored by `bmad-customize`. |
| 33 | `d3a1554d5` | wip | No | Hermes/coordination only; no customize action. |
| 34 | `292d1c160` | feat(workspace): remove distro naming | Maybe | Rename made Workspace core-facing; add `customize.toml` discovery for core skills before asking operators to tune Workspace behavior. |
| 35 | `a1c161dfb` | feat(workspace): add v4 session setup gate | Yes | Setup Gate uses planning capabilities. Future `bmad-customize` should author/check setup guidance via `bmad-workspace` safe facts/templates, not hand-edited core skill text. |
| 36 | `e3f5ac0e8` | wip | No | Hermes/coordination only; no customize action. |
| 37 | `e5f8840fe` | feat(workspace): add v5 status inspectability | No | Status projection must remain read-only and deterministic. |
| 38 | `1a7030be0` | feat(workspace): add v6 inventory handoff | Maybe | Handoff prose/templates could be exposed as safe template scalars; lifecycle/status logic should not be customizable. |
| 39 | `021357759` | feat(workspace): add v7 session archives | No | Archive shape/checksums should remain non-customizable. |
| 40 | `e9466b79d` | wip | No | Hermes/coordination only; no customize action. |
| 41 | `4f4e3136b` | feat(workspace): add v8 routing contract | Maybe | Routing catalog remains code/CSV-owned; `bmad-customize` could only help explain workflow override intent, not alter routing rules. |
| 42 | `c1fbfb608` | feat(workspace): add v9 result ledger | No | Result ledger must remain manual evidence-only and not depend on custom TOML. |
| 43 | `f752cbf54` | chore(workspace): record session state | No | Coordination state only; no customize action. |
| 44 | `0ba3af07a` | feat(workspace): add manual executor contract | Maybe | Executor contract prompts/manual steps could later have safe template scalars; grant/write boundaries must stay code-owned. |
| 45 | `5781270d5` | docs(workspace): add v11 closeout plan | Maybe | Closeout guidance templates could be customizable through `bmad-workspace`; artifact schema should not. |
| 46 | `4527d1703` | feat(workspace): add manual closeout | No | Closeout artifact validation should stay deterministic. |
| 47 | `7cf850570` | feat(workspace): add v13 release readiness | No | Release gates should not be customizable; keep `npm ci && npm run quality` fixed. |
| 48 | `7e12e2d6b` | feat(workspace): add evidence index trust layer | No | Evidence Index is trust projection; no customization input. |
| 49 | `b6a70b10f` | feat(workspace): add read-only archive diff | No | Diff behavior should stay read-only and deterministic. |
| 50 | `01546d281` | feat(workspace): add v16 review manifest | Maybe | Review checklist wording/templates could be customizable; Review Manifest contract should not. |
| 51 | `f7ccf10a3` | chore(workspace): record v16 coordination state | No | Coordination state only; no customize action. |
| 52 | `65bef3890` | docs(workspace): consolidate workspace documentation | Maybe | Consolidation should add explicit "customize-able vs not customize-able" boundaries in current docs. |
| 53 | `e58ec30c2` | docs(workspace): plan v18 codex affordances | Maybe | Operator affordance prose is a safe `persistent_facts` candidate; live adapter/runtime permission remains out of scope. |
| 54 | `28377c5f2` | test(workspace): quarantine release labels to history | No | History hygiene test; no customize action. |
| 55 | `0c04c9eec` | docs(workspace): compile history bmads | No | Historical archive only; no customize action. |
| 56 | `14bd6c99b` | feat(workspace): reject legacy artifacts | No | Legacy rejection must remain non-customizable. |
| 57 | `fdec3618f` | docs(workspace): compile strict reject history | No | Historical archive only; no customize action. |
| 58 | `77d368051` | feat(workspace): remove archive compatibility surface | No | Compatibility removal is contract-owned, not customizable. |
| 59 | `4d742960a` | docs(workspace): compile archive manifest cleanup history | No | Historical archive only; no customize action. |
| 60 | `977f9b967` | revert: remove prompt builder skill | Maybe | Revert avoids unsupported core skill. If revived, require a `customize.toml` surface and `bmad-customize` authoring story. |
| 61 | `15c620e23` | docs(workspace): compile prompt builder removal history | No | Historical archive only; no customize action. |
| 62 | `82cd68406` | feat(workspace): harden release safety gates | No | Safety gates and command registry should not be customizable. |
| 63 | `385540243` | docs(workspace): compile release hardening history | No | Historical archive only; no customize action. |
| 64 | `12ab0d209` | feat: add codex self-improvement workflow | Yes | Add `bmad-self-improve/customize.toml` with safe append-only facts/templates so org policy notes do not require editing the core skill. |
| 65 | `15759a925` | feat(skills): add self-improve operator runbook | Yes | Operator runbook templates can be exposed through `bmad-self-improve` template scalars; invariants stay fixed. |
| 66 | `5bbd34cd4` | chore: preserve pre-automation worktree state | Maybe | Policy added here should remain non-customizable, but `bmad-customize` could help add org-specific persistent facts around preservation evidence. |
| 67 | `7b99f6d4c` | fix(self-improve): harden dirty worktree preflight | No | Dirty worktree safety is invariant; no customize action. |
| 68 | `d2ce4e38b` | fix(self-improve): add activation-state evidence contract | No | Activation State contract should stay deterministic. |
| 69 | `ea35a12be` | test: cover self-improve invariant contracts | No | Test-only commit; no customize action. |
| 70 | `abe53ebcd` | fix(party-mode): add self-improve contract checks | Maybe | Party Mode could get safe `persistent_facts`; contract checks should not be customizable. |
| 71 | `393de54ec` | chore(workspace): update hermes coordination state | No | Coordination state only; no customize action. |
| 72 | `26352a091` | feat: add self-improve capability invariants | Yes | Registry introduced here should later drive generated skill/docs surfaces, with `bmad-customize` guiding additions instead of manual prose/TOML edits. |
| 73 | `ac8d08b97` | feat: expose planning capabilities across BMAD | Yes | Strong candidate: add `bmad-customize` recipe/generator for shared planning capability registry plus safe surfaces. |
| 74 | `2def0a68a` | feat(self-improve): validate resume checkpoint evidence | No | Resume evidence contract should remain code-owned. |
| 75 | `a1772fcdd` | feat(self-improve): harden resume evidence gates | No | Resume gate logic should remain deterministic; customize may only add explanatory facts. |
| 76 | `ce0403ada` | docs: clarify Codex advanced config boundaries | Maybe | Good boundary: local Codex config is advisory only. Add this as a `bmad-customize` education path, not runtime input. |
| 77 | `54fd60edc` | feat: add repository graph pipeline | No | Graph pipeline and generated graph artifacts should not depend on `_bmad/custom`. |
| 78 | `2de68fbe8` | feat(workspace): add Graphify graph evidence intake | No | Graph evidence intake must stay advisory/deterministic and not customizable. |
| 79 | `2de09c795` | feat(workspace): add evidence gate v1 packets | No | Evidence Gate v1 required checks should not be customizable. |
| 80 | `a367eb642` | fix(workspace): block unknown advisory routes | No | Unknown route rejection should stay strict and non-customizable. |
| 81 | `ed885f804` | test(workspace): cover fuzzy advisory route rejection | No | Test-only commit; no customize action. |
| 82 | `55e3b0a9e` | docs(workspace): map validator owner review gates | Maybe | Manual review map can mention where `bmad-customize` helps author capability requests and where it must not. |
| 83 | `cdfdb600e` | feat(workspace): add capability verifier | Yes | Best target: keep verifier JSON-only/read-only, but make `bmad-customize` produce/validate Capability Request JSON from the template so humans do not hand-author config. |

## Suggested Future Task

Create a follow-up issue or story:

Title: "Add guided BMad Customize authoring for Workspace capability requests and safe core skill overrides"

Acceptance criteria:

- `bmad-customize` can guide an operator through authoring a
  `bmad-workspace-capability-request` JSON fixture from
  `docs/workspace/templates/capability-request.template.json`.
- The flow runs `bmad workspace verify-capability --input <fixture>` and reports
  the verdict without making the verifier read `_bmad/custom`.
- `bmad-customize` discovery finds nested BMM skill roots without requiring the
  operator to pass every phase directory manually.
- Core Workspace/Self-Improve/Help/Party Mode customization surfaces exist only
  for safe append/template behavior, with tests proving safety invariants cannot
  be weakened through overrides.
- Docs clearly split three paths: per-skill override via `bmad-customize`,
  capability request JSON via `bmad-customize`, and central config handoff that
  remains out of scope for v1.
