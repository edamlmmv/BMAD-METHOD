---
manifestFile: '{project-root}/bmad.config.yaml'
entrypointFile: '{project-root}/BMAD.md'
hermesContextFile: '{project-root}/.hermes.md'
projectContextFile: '{output_folder}/project-context.md'
sprintStatusFile: '{output_folder}/sprint-status.yaml'
handoffFile: '{output_folder}/openclaw-hermes/handoff.md'
---

# OpenClaw/Hermes BMAD Workflow

**Goal:** Create a manifest-first BMAD that standardizes Hermes as the
chief-of-staff brain and OpenClaw as the delegated worker layer for continuous
operation on a local machine or VPS.

**Your Role:** You are formalizing a reusable runtime contract, not just writing
notes. The output should feel like one coherent BMAD with clear ownership,
entrypoints, and local-state boundaries.

## Deliverables

Generate or update these files:

- `{manifestFile}` — canonical machine-readable BMAD definition
- `{entrypointFile}` — human-readable BMAD entrypoint
- `{hermesContextFile}` — Hermes project context
- `{projectContextFile}` — local operational context for the workspace
- `{sprintStatusFile}` — local BMAD phase/state tracker
- `{handoffFile}` — Hermes to OpenClaw delegation contract

## Core Contract

Lock these decisions before writing anything:

- Hermes is the **brain** and chief of staff.
- OpenClaw is the **worker layer** and delegated execution surface.
- `_bmad-output/` is **local operational state**, not the whole BMAD.
- Tracked repo files define the BMAD contract.
- Machine-local config under `~/.hermes` and `~/.openclaw` holds secrets,
  providers, gateway auth, memory, and runtime-specific settings.
- Prefer durable config, prompts, skills, context files, and docs over ad hoc
  command sequences.

## Upstream Inputs

Before writing the deliverables, search for and load the most relevant context:

- `*discovery-context*.md`
- `*workflow-contract*.md`
- `*architecture*.md`
- `*project-context*.md`
- existing `bmad.config.yaml`, `BMAD.md`, and `.hermes.md`

Use the strongest available inputs in this priority order:

1. Discovery Context
2. Workflow Contract
3. Architecture
4. Existing BMAD files
5. Workspace facts inferred from the repository

If upstream context is missing, proceed with the default chief-of-staff topology
and clearly mark assumptions in the generated files.

## Generation Rules

1. Read and reuse the templates in `./templates/`.
2. If a target file already exists, refine it in place instead of clobbering it.
3. Keep tracked files free of secrets, gateway tokens, and provider API keys.
4. Ensure every entrypoint points back to `{manifestFile}` first.
5. Keep the role split consistent across all outputs:
   - Hermes plans, remembers, synthesizes, and delegates
   - OpenClaw executes bounded worker tasks and returns evidence
6. Add an explicit OpenClaw security section to the manifest and human
   entrypoint. Cover trust boundary, local-first Gateway exposure, channel
   pairing/allowlists, secrets staying off tracked files, and the expected
   host-hardening baseline for VPS use.
7. Add a runtime bundle manifest or equivalent reusable config that maps which
   existing BMAD skills install to Hermes versus OpenClaw.
8. Add a reusable bootstrap path for `~/.hermes/config.yaml`,
   `~/.hermes/.env`, and `~/.openclaw/openclaw.json`, and make the human
   guidance point to it instead of assuming hand-authored machine-local config.
9. Make local versus tracked state explicit.
10. If a recurring automation or prompt exists in the repo, update it to follow
   the manifest-first read order.

## File Writing Order

1. Copy and adapt `./templates/bmad-config.yaml` to `{manifestFile}`.
2. Copy and adapt `./templates/BMAD.md` to `{entrypointFile}`.
3. Copy and adapt `./templates/hermes-context.md` to `{hermesContextFile}`.
4. Copy and adapt `./templates/project-context.md` to `{projectContextFile}`.
5. Copy and adapt `./templates/sprint-status.yaml` to `{sprintStatusFile}`.
6. Copy and adapt `./templates/handoff.md` to `{handoffFile}`.

## Verification Checklist

Before presenting the result, verify:

1. `{manifestFile}` is the first-read canonical source in every tracked
   entrypoint.
2. Hermes and OpenClaw roles are not inverted anywhere.
3. `{output_folder}` is described as local operational state, not the full BMAD.
4. Tracked files do not contain provider credentials or gateway tokens.
5. The outputs reference machine-local config surfaces for Hermes and OpenClaw.
6. The handoff file is framed as Hermes to OpenClaw, not the other way around.
7. The OpenClaw security posture is explicit enough that a future agent does
   not need to infer basic hardening expectations from scattered notes.
8. The runtime bundle mapping makes it clear which skills install verbatim to
   Hermes and which skills are adapted for OpenClaw worker use.

## Completion

Present:

- the files created or updated
- the chief-of-staff topology you locked in
- any assumptions you had to make
- the next recommended step:
  - provision the local runtime
  - provision the VPS runtime
  - align existing profile-level custom agents
