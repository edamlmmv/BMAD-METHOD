---
title: "Capability Pack Forge"
description: Local artifact generator for draft BMAD capability packs
---

# Capability Pack Forge

Capability Pack Forge turns local evidence files into reviewable BMAD
capability-pack drafts. It helps operators move from Context7 docs evidence to
repeatable BMAD artifacts without changing Workspace runtime behavior.

## Mental Model

Forge consumes evidence files, emits draft capability-pack artifacts, then a
human reviews the output and chooses the next BMAD workflow.

It is not a Workspace subcommand, verifier, scheduler, installer, grant source,
live adapter, or `_bmad/custom` authority.

## Scope

| In v1 | Out of scope |
| --- | --- |
| Local `forge-request.json` input | Live Context7 or MCP calls |
| Local Context7 docs evidence refs | Docker, PostgreSQL, Git, Graphify, or Codex execution |
| Existing or candidate Capability Request JSON | Workspace command additions |
| Optional advisory evidence references | `verify-capability` behavior changes |
| Draft TOML, skill, readiness, and Codex task artifacts | Skill install or `_bmad/custom` writes |
| Deterministic manifest and output schema | Runtime authority, grant authority, or hidden execution |

## Command

```bash
node tools/capability-pack-forge.js --input <forge-request.json> --output <dir>
```

The request file and all evidence refs must be local files. Evidence refs are
references, not integrations.

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
app-server, Apple Passwords, keychain, or network. It must not store raw
secrets, query results, connection strings, or API keys.

Forge does not alter `bmad workspace`, `verify-capability`, Workspace
Capability Contract matching, Grant Guard, Evidence Gate behavior, or
Self-Improve continuation policy.
