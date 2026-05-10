---
title: "Codex Executable Capability Evidence Plan"
description: "Executable evidence plan for Codex capability claims, Workspace closeout, and verifier boundaries"
---

# Codex Executable Capability Evidence Plan

Declared capability is not demonstrated capability.

Codex capability claims need three separate truths:

| Truth | Authority | Evidence |
| --- | --- | --- |
| Declared contract | `bmad workspace verify-capability` | Self-contained Capability Request JSON and declared-contract verdict. |
| Executable proof | Codex Desktop, Codex CLI, or `codex mcp-server` | Command or tool transcript with version, cwd, timestamp, exit code, output summary, and pass/fail result. |
| Human decision | Workspace result/review/closeout | Evidence refs, reviewer judgment, unresolved gaps, and final operator closeout. |

`bmad workspace verify-capability` validates declared JSON contract only. It must not
read `_bmad/custom`, local Codex config, project `.codex/config.toml`,
app-server APIs, live Graphify output, or Workspace Session artifacts.

BMad Customize is authoring and education only; it is not executable evidence.
For Codex MCP-aware customization, use
[BMad Customize And Codex MCP Planning](./mcp/customize-codex-mcp-planning.md) to
keep Codex MCP host context, Codex MCP server context, declared capability,
executable proof, and human decision separate.
Codex MCP is advisory authoring context for Customize; self-contained
Capability Request JSON is sealed verifier evidence for Workspace.

## Evidence Classes

| Evidence class | Allowed source | Counts as executable proof? | Purpose |
| --- | --- | --- | --- |
| Declared contract | Capability Request JSON passed to `bmad workspace verify-capability` | No | Check declared capability shape and constraints. |
| Authoring guidance | BMad Customize docs, reminders, and resolver output | No | Teach authors how to prepare requests and reviews. |
| Docs/config context | AGENTS.md, OpenAI docs, Codex config, project `.codex` files, `mcp_servers.*`, `codex mcp`, MCP server listings | No | Explain local affordances and operator context. |
| Executable CLI proof | Codex CLI command transcripts | Yes | Prove a local Codex command surface ran. |
| Executable Desktop proof | Codex Desktop launch or observed Desktop run | Yes | Prove a Desktop operator flow ran and was reviewed. |
| MCP proof | `codex mcp-server` JSON-RPC stdio transcript | Yes | Prove the Codex MCP server initialized and exposed expected tools. |
| Workspace closeout | Result Ledger, Worktree Review, Manual Closeout, archive evidence | Yes, if command-backed | Store proof and the human decision record. |

Workspace result/review/closeout artifacts are evidence containers, not evidence by
themselves. If evidence cannot be rerun as command or tool behavior, mark it
`context`, not `proof`.

## Evidence Package

Every Codex executable capability claim should produce this package or equivalent
Workspace refs:

| Artifact | Required content |
| --- | --- |
| `capability-request.json` | Self-contained declared capability request. |
| `workspace-verdict.json` | `bmad workspace verify-capability --input capability-request.json` output. |
| `codex-cli-evidence.jsonl` | Raw or summarized Codex CLI command events. |
| `codex-mcp-server-transcript.jsonl` | JSON-RPC initialize and JSON-RPC tools/list transcript for `codex mcp-server`. |
| `codex-desktop-evidence.md` | Optional Desktop launch, screenshot path, app log, or terminal observation. |
| `workspace-result.md` | Commands run, versions, pass/fail, and evidence refs. |
| `workspace-review.md` | Reviewer check that evidence is executable, not docs/config/customize context. |
| `workspace-closeout.md` | Final capability decision, unresolved gaps, and next action. |
| `quality-log.txt` | Targeted checks plus `npm ci && npm run quality` before push. |

## Required Command Paths

Codex CLI smoke probes:

```bash
codex --version
codex exec --help
codex mcp --help
codex mcp-server --help
```

Codex CLI task proof, when a live model task is intended:

```bash
codex exec \
  --ephemeral \
  --sandbox read-only \
  --json \
  --output-last-message /tmp/codex-capability-last-message.txt \
  "Report CODEX_CAPABILITY_OK and do not edit files."
```

Codex Desktop proof:

```bash
codex app <workspace>
```

For this checkout, the concrete command is:

```bash
codex app /Users/edam/Documents/TODA/BMAD-METHOD
```

Desktop proof must include a manual observation, screenshot path, Desktop
terminal transcript, or app log reference. `codex app --help` proves the
launcher exists; it does not prove Desktop opened the workspace.

Codex MCP-server proof:

```bash
codex mcp-server
```

The evidence must include a real stdio transcript with:

- JSON-RPC initialize request and response.
- `serverInfo.name` equal to `codex-mcp-server`.
- `serverInfo.version` captured from the response.
- JSON-RPC tools/list request and response.
- Normalized tools containing `codex` and `codex-reply`.

Help text alone is not enough for `codex mcp-server` proof.

## Tool-Backed Baseline

The planning pass recorded these executable observations:

| Probe | Result |
| --- | --- |
| `codex --version` | `codex-cli 0.128.0` |
| `codex exec --help` | Non-interactive Codex command surface present. |
| `codex mcp --help` | MCP management command surface present. |
| `codex mcp-server --help` | Stdio MCP server command surface present. |
| JSON-RPC initialize | `serverInfo.name = codex-mcp-server`, version `0.128.0`. |
| JSON-RPC tools/list | Tools include `codex` and `codex-reply`. |
| `bmad workspace verify-capability --input docs/workspace/templates/capability-request.codex-manual.example.json` | `ok: true` for `executor.codex.manual`; `requiresGrant` warning preserved. |

These observations prove local command availability only. They do not promote
support, grant write authority, or make verifier output executable proof.

## Verifier Guard

Embedded `capabilities[]` declarations in Capability Request JSON must stay
declarative. Fields such as `executableEvidence`, `commandEvidence`, and
`mcpEvidence` are invalid inside declarations. Executable evidence belongs in
Workspace result/review/closeout artifacts.

This guard keeps `verify-capability` deterministic and self-contained while
still allowing operators to record executable evidence separately.

## BMad Customize Gaps

Customize can shape agent/workflow behavior and help authors prepare Capability
Requests. It cannot prove runtime execution.

Gaps to close outside the verifier:

| Gap | Fix |
| --- | --- |
| No Codex executable transcript template | Use `docs/workspace/templates/codex-executable-evidence.template.json`. |
| Core operator skills have limited safe customization surfaces | Add append-only reminders only through exposed `customize.toml` fields. |
| Existing overrides can look like proof | State that `_bmad/custom/*.toml` is authoring and education only. |
| Codex MCP-server evidence was not first-class | Treat `codex mcp-server` JSON-RPC transcript as executable CLI proof. |
| Codex MCP host config can look like verifier input | State that `mcp_servers.*`, `codex mcp`, `~/.codex/config.toml`, and project `.codex/config.toml` are planning context only. |

No central `_bmad/custom/config.toml` generation is part of this plan.

## Acceptance

- `verify-capability` remains read-only and self-contained.
- Codex executable capability is accepted only when Workspace evidence includes
  command-backed Codex Desktop, CLI, or MCP-server proof.
- `codex mcp-server` proof requires JSON-RPC stdio transcript, not help text
  alone.
- Docs, config, AGENTS.md, `_bmad/custom`, app-server APIs, live Graphify, and
  Workspace Session artifacts are out of scope for `verify-capability`.
- Targeted checks include `node test/test-workspace-contracts.js`,
  `npm run validate:skills`, and the Codex manual capability request verifier.
- Before push, run `npm ci && npm run quality` on `HEAD`.

## Known Risk

`npm run test:workspace` was red during planning because Graphify Command
Evidence tests failed with a `uv` PEP508 empty-field error. That is tracked as an
existing Graphify command-evidence blocker, not a Codex evidence-plan
requirement. Do not claim full Workspace green until that blocker is fixed or
explicitly isolated.
