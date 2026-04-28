# BMAD Contract

## Subject

This workspace is BMAD framework itself, not downstream product implementation.

## Operating Rule

Run manifest-first. Use `bmad.config.yaml` as entrypoint, then this contract, then Hermes context, then local ops state.

## Current Focus

Provision minimal BMAD/Hermes/OpenClaw operating surface for this repository so future automation runs have durable coordination state without inventing feature work.

## In Scope

- Define coordination contract
- Define phase selection rules
- Define local operational artifacts under `_bmad-output/`
- Keep implementation idle until scoped story or provisioning task exists

## Out of Scope

- Product feature implementation without explicit story
- Repo source edits unrelated to BMAD provisioning
- Secrets, provider tokens, or personal credentials in tracked files

## Phase Rule

- `coordination`: missing or stale BMAD operating artifacts; initialize or repair them
- `planning`: explicit scoped provisioning task exists and needs breakdown
- `execution`: bounded task delegated to OpenClaw and recorded in handoff
- `review`: delegated task complete and needs validation or closeout

Current phase: `coordination`

## OpenClaw Delegation Rule

Every OpenClaw task must be:

1. Explicitly scoped
2. Logged in `_bmad-output/openclaw-hermes/handoff.md`
3. Limited to bounded execution or tool-heavy work

No implicit delegation.
