---
title: 'Zsh Shell MCP Capability Planning'
description: Boundary notes for zsh-capable shell MCP capability requests
---

# Zsh Shell MCP Capability Planning

## Decision

`host.mcp.shell.zsh` is an experimental, declaration-only `host.mcp`
capability for operator-provided zsh shell evidence through Desktop Commander
MCP. It replaces the rejected `@mako10k/mcp-shell-server` candidate because the
rejected package did not satisfy the 1000+ GitHub star threshold.

This is not an official MCP addition. BMad Help's official-MCP prompt would
reject it as unofficial; Workspace records it only as an experimental,
third-party advisory surface because it is zsh-capable and clears the explicit
1000+ star candidate gate.

## Source Register

| Source id | Source | Owner | Reviewed | What it supports | Not authority for |
| --- | --- | --- | --- | --- | --- |
| `desktop_commander_github` | [Desktop Commander MCP](https://github.com/wonderwhy-er/DesktopCommanderMCP) | Desktop Commander maintainers | 2026-05-07 | Candidate identity and GitHub star threshold evidence. | Workspace verifier input, endorsement, install permission. |
| `desktop_commander_readme` | [Desktop Commander README](https://github.com/wonderwhy-er/DesktopCommanderMCP#desktop-commander-mcp) | Desktop Commander maintainers | 2026-05-07 | MCP terminal command execution, configurable `defaultShell`, and command-level shell selection such as `/bin/zsh`. | Runtime proof, allowed-directory enforcement for shell commands, no-write proof. |
| `desktop_commander_security` | [Desktop Commander security policy](https://github.com/wonderwhy-er/DesktopCommanderMCP/security/policy) | Desktop Commander maintainers | 2026-05-07 | Known security limitation boundary and Docker-isolation recommendation. | Security hardening proof, Workspace grant authority. |
| `openai_codex_mcp_docs` | [Codex MCP docs](https://developers.openai.com/codex/mcp#connect-codex-to-an-mcp-server) | OpenAI | 2026-05-07 | Codex MCP configuration shape only. | Third-party server trust, zsh execution proof, Workspace verifier input. |
| `openai_codex_mcp_cli` | [Codex MCP CLI reference](https://developers.openai.com/codex/cli/reference#codex-mcp) | OpenAI | 2026-05-07 | `codex mcp` management semantics only. | Automatic setup, live server availability, Workspace verifier input. |

## Declared Capability

```json
{
  "id": "host.mcp.shell.zsh",
  "group": "host.mcp",
  "provider": "@wonderwhy-er/desktop-commander",
  "interface": "local-zsh-shell-mcp",
  "allowedInNormalSession": true,
  "allowedInBaseImprovement": false,
  "requiresGrant": true,
  "writes": [],
  "forbiddenWrites": [
    "workspace-base",
    "target-repo",
    "host-filesystem",
    "host-process",
    "external-network",
    "scheduler",
    "daemon",
    "live-adapter",
    "secret-store"
  ],
  "outputs": ["zsh-shell-mcp-operator-evidence.json"],
  "upstreamGapProofRequired": false
}
```

`writes: []` means BMAD declares no managed writes for this capability. It does
not mean a shell command, Desktop Commander file tool, or process tool is
incapable of mutating the host. Operator evidence must be limited to
non-mutating observations and recorded later as manual evidence.

## Zsh Quoting Fix

In zsh, template literals inside a double-quoted `node -e` command can be
interpreted by the shell before Node sees them. Use single quotes around the
Node program so `${p.profileId}` stays a JavaScript template literal.

```bash
node -e 'const r=require("./docs/workspace/capability-profile-registry.json"); for (const p of r.profiles) console.log(`${p.profileId}|${p.capabilityId}|${p.toolName}|${p.supportState}|${p.trustBoundary}`)'
```

The same single-quoted form is valid for bash and avoids provider-specific
shell expansion.

## Boundaries

- No auto-install, setup script, `codex mcp add`, Docker launch, scheduler,
  daemon, or live adapter.
- No Desktop Commander app setup, remote MCP tunnel, shell process start, file
  operation, process kill, or configuration write from Workspace.
- No `_bmad/custom` authority. Customize may author guidance only.
- No secrets, shell history, command transcripts containing credentials,
  screenshots of credentials, or MCP config containing credentials.
- No destructive command examples in templates. Evidence examples must stay
  non-mutating and should record summaries, not full terminal transcripts.
- Desktop Commander `allowedDirectories` settings are not a shell sandbox;
  upstream docs state terminal commands can access outside configured
  file-operation directories.

## Capability Request Use

Use
`docs/workspace/templates/capability-request.zsh-shell-mcp.example.json` when a
Workspace discussion needs optional zsh shell MCP operator evidence. Use
`docs/workspace/templates/zsh-shell-mcp-operator-evidence.template.json` to
record manual evidence shape. The verifier checks only the self-contained
Capability Request JSON and declared fields; it does not inspect live Desktop
Commander, Codex config, shell state, PATH, npm state, Docker, or `_bmad/custom`.

## Acceptance Notes

- The old `@mako10k/mcp-shell-server` candidate is rejected by the 1000+ star
  gate.
- `wonderwhy-er/DesktopCommanderMCP` clears the explicit star threshold and
  documents zsh selection, but remains third-party and broad-permission.
- The capability is experimental/advisory only until a future review proves a
  narrower official zsh shell MCP with better security boundaries.

Before pushing, run `npm ci && npm run quality` on the exact checkout to be
pushed.
