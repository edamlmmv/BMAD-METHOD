# Hermes to OpenClaw Handoff

## Objective

Operate a manifest-first BMAD for this workspace with Hermes as the
chief-of-staff brain and OpenClaw as the delegated worker layer.

## Current Phase

setup

## Required Inputs

- `bmad.config.yaml`
- `BMAD.md`
- `.hermes.md`
- `AGENTS.md`
- `{{output_folder}}/project-context.md`
- `{{output_folder}}/sprint-status.yaml`

## Requested Output

- Establish or refine the next BMAD artifact with the highest value.
- Use OpenClaw only for bounded execution or validation work.

## Constraints

- Prefer durable configuration over ad hoc commands.
- Do not invent missing product intent.
- Reconcile results into `{{output_folder}}/` before changing phase.

## Definition of Done

- The next BMAD step is explicit.
- Shared artifacts reflect the latest known state.
- Any blocker is documented as a single focused question.

## Evidence / Changes

- Initial OpenClaw/Hermes BMAD contract created from templates.

## Validation Results

- Awaiting the first Hermes-led loop run.

## Remaining Risks

- Machine-level provisioning for Hermes and OpenClaw still needs to be carried
  out on the target computer or VPS.
- Product-specific project intent may still be missing.

## Next Action

Hermes should inspect the workspace, prepare the next provisioning or artifact
step, and delegate to OpenClaw only when a bounded worker task is ready.
