---
name: bmad-customize
description: Authors and updates customization overrides for installed BMad skills. Use when the user says 'customize bmad', 'override a skill', 'change agent behavior', or 'customize a workflow'.
---

# BMad Customize

Translate the user's intent into a correctly-placed TOML override file under `{project-root}/_bmad/custom/` for a customizable agent or workflow skill. Discover, route, author, write, verify.

Scope v1: per-skill `[agent]` overrides (`bmad-agent-<role>.toml` / `.user.toml`) and per-skill `[workflow]` overrides (`bmad-<workflow>.toml` / `.user.toml`). Central config (`{project-root}/_bmad/custom/config.toml`) is out of scope — point users at the [How to Customize BMad guide](https://docs.bmad-method.org/how-to/customize-bmad/).

When the target's `customize.toml` doesn't expose what the user wants, say so plainly. Don't invent fields.

## BMAD Loop Instance Authoring

For `bmad-loop` and predefined loop instances such as `bmad-self-improve`,
Customize may author exposed `[workflow]` instance defaults only: goal refs,
scope, branch prefix, checkpoint location, caps, quality command, allowed write
roots, hooks, facts, template refs, and completion text. Treat these as
`LoopRunConfig` fields only. The runtime loop resolver must still reject
missing goal input, unsafe branches, missing finite stop conditions, or
gate-bypass attempts.

Thin repo-owned loop instances resolve `loop_skill` first, then merge instance
defaults, then team/user overrides. Unspecified fields inherit from the
referenced loop skill defaults.

Do not imply that `_bmad/custom/*.toml` creates runtime authority, schedules a
loop, grants writes, bypasses dirty preflight, weakens no-push, changes
Workspace schema, proves verifier compatibility, or permits continuation.
Customize is authoring and education only.

`WorkflowBundle` assets, Party Mode gate docs, candidate registries, chain
models, queue models, scheduler behavior, slash-command behavior, and persisted
recursion are not `bmad-customize` v1 outputs. Those remain repo-owned source
artifacts or deferred design surfaces.

## Capability Verification Authoring

For Workspace capability verification, use BMad Customize as the authoring and
education control plane only. Help the user start from
`docs/workspace/templates/capability-request.template.json`, explain the
declared capability fields, and route any per-skill behavior changes through the
normal exposed `customize.toml` surfaces. For named-tool examples, point Codex
requests at
`docs/workspace/templates/capability-request.codex-manual.example.json` and
Graphify requests at
`docs/workspace/templates/capability-request.graphify-repo-intake.example.json`.

When the user says "use Codex" or "use Graphify", you may point at
`docs/workspace/capability-profile-registry.json` as advisory authoring context:
exact capability ids, support states, trust boundaries, evidence refs, and
repair hints. The registry helps authors choose and explain a Capability
Request. It is not a customization surface and not verifier authority.
When the user says "use Codex MCP", "use MCP", or "use OpenAI Docs MCP",
separate the surfaces before authoring:

- **Advisory authoring context** — Codex MCP facts may inform Customize
  guidance, examples, prompts, and evidence checklists. They are never sealed verifier evidence.
- **Codex MCP host** — Codex configuration and CLI affordances such as
  `mcp_servers.*`, `~/.codex/config.toml`, trusted project `.codex/config.toml`,
  and `codex mcp`. These facts are operator context only.
- **Codex MCP server** — a configured MCP server, such as OpenAI Docs MCP, that
  can supply documentation or tool context to a human or Codex operator.
- **Workspace declared capability** — the self-contained Capability Request JSON
  passed to `bmad workspace verify-capability`, such as
  `docs/workspace/templates/capability-request.codex-manual.example.json`.
- **Sealed verifier evidence** — the self-contained Capability Request JSON and
  declared capability entries are the only inputs to the Workspace verifier.
- **Executable proof and human decision** — command-backed proof and reviewer
  judgment recorded later through Workspace result/review/closeout evidence.

Use the OpenAI Docs MCP server as the preferred source for Codex product facts.
For Codex MCP authoring, use
`https://developers.openai.com/codex/config-reference#configtoml` for
`mcp_servers.*` and config scope, and
`https://developers.openai.com/codex/cli/reference#codex-mcp` for `codex mcp`
management semantics. Do not copy those facts into verifier inputs as proof.
Customize may write docs, templates, prompts, warnings, examples, and evidence
checklists. It may also add per-skill reminders through exposed
`customize.toml` fields. Customize must not imply that Workspace reads Codex
MCP host config, calls live MCP servers, or treats MCP availability as declared
capability compatibility.

When the user says "use Context7", "use Context7 MCP", "use Git MCP", or "use
mcp-server-git", separate the surfaces before authoring:

- **Context7 Docs MCP** — optional documentation context only. Use
  `host.mcp.context7.docs` and
  `docs/workspace/templates/capability-request.context7-docs.example.json`.
  Context7 may fetch current docs, including MCP and Git MCP docs, but it does
  not perform Git operations.
- **Google Apps Script docs through Context7** — use
  `host.mcp.context7.google-apps-script.docs`,
  `docs/workspace/mcp/context7-google-apps-script-planning.md`, and
  `docs/workspace/templates/capability-request.context7-google-apps-script.example.json`
  for Apps Script guide, reference, and samples source mapping. Treat the
  sources as docs evidence only, not Apps Script runtime proof, trigger/deploy
  proof, or verifier input. Generic docs-only Context7 requests still use
  `host.mcp.context7.docs`.
- **WebGL Fundamentals docs through Context7** — use
  `host.mcp.context7.webgl-fundamentals.docs`,
  `docs/workspace/mcp/context7-webgl-fundamentals-planning.md`, and
  `docs/workspace/templates/capability-request.context7-webgl-fundamentals.example.json`
  for WebGL Fundamentals source mapping. Treat WebGL2 as an upstream caveat and
  discovery route only; do not claim a separate Context7 WebGL2 source or
  WebGL2-specific coverage without retrieved evidence. Generic docs-only
  Context7 requests still use `host.mcp.context7.docs`.
- **Context7 credential handling** — recommended local credential source is
  Apple Passwords item `Context7`. The operator may manually expose only
  `CONTEXT7_API_KEY` in a local shell/session. Customize must never read Apple
  Passwords, ask the user to paste the key, store the key, screenshot it, or put
  it in examples, MCP config, evidence artifacts, logs, PRs, or issues.
  Examples may use only `<CONTEXT7_API_KEY>` or `<redacted>`. Evidence may record
  `CONTEXT7_API_KEY=set` and
  `credentialSource: "Apple Passwords item Context7"`, never the value.
- **Git MCP local repository tools** — optional local Git tools only. Use
  `host.mcp.git.local` and
  `docs/workspace/templates/capability-request.git-mcp-local.example.json`.
  Status, diff, log, and branch observations are manual evidence only; add,
  commit, and branch tools are write-capable and manual/grant-gated.
- **GitHub connector or GitHub MCP** — separate collaboration surface for
  issues, PRs, CI, and reviews. Do not treat it as local Git MCP proof.
- **Workspace verifier** — self-contained Capability Request JSON only. Live
  Context7 config, Git MCP runtime state, repository dirty state, GitHub
  connector state, Codex config, and `_bmad/custom` are not verifier input.
- **Pre-push authority** — local `git` CLI remains fallback and exact pre-push
  authority, including `npm ci && npm run quality` on the exact checkout and
  `HEAD` being pushed.

When the user says "use Docker MCP", "use Docker MCP Toolkit", "use Docker MCP
Gateway", "use Docker MCP Catalog", or "use Context7 through Docker MCP",
separate the surfaces before authoring:

- **Docker MCP Toolkit** — optional Docker Desktop/CLI setup and catalog
  guidance only. Use `host.mcp.docker.toolkit`,
  `docs/workspace/mcp/docker-mcp-context7-planning.md`, and
  `docs/workspace/templates/capability-request.docker-mcp-toolkit.example.json`.
- **Docker MCP Gateway** — runtime gateway process and profile execution. Live
  gateway state, tool lists, Docker CLI shape, and local profile files are not
  verifier authority.
- **Docker MCP Catalog and Docker Hub Context7 MCP server** — source and package
  lookup context only, including Docker Hub `mcp/context7`; catalog availability
  does not prove local Context7 configuration.
- **Context7 secret handling** — prefer Docker MCP secret / `secretRef: Context7`,
  then `CONTEXT7_API_KEY` from a secret manager. Use `--api-key` only as a
  last-resort manual path because process args can leak.
- **Apple Passwords entry named `Context7`** — user-owned runtime source only.
  Before future local secret setup, ask the user to confirm the entry exists.
  Do not read, display, store, log, screenshot, or record the key.
- **Workspace verifier** — self-contained Capability Request JSON only. Docker
  MCP Toolkit, Docker MCP Gateway, Docker MCP Catalog, Docker secrets, live
  Context7 output, Apple Passwords state, local MCP config, network state, and
  `_bmad/custom` are not verifier input.

For Docker MCP and Context7 examples, use only `<CONTEXT7_API_KEY>` or
`<redacted>`. Do not create repo MCP config, env files, logs, fixtures,
results, closeouts, docs examples, or tests containing key material.

When the user says "use zsh MCP", "use shell MCP", "use local shell MCP",
"use Desktop Commander MCP", or names `@wonderwhy-er/desktop-commander`,
separate the surfaces before authoring:

- **Zsh Shell MCP** — optional/operator-provided shell evidence only. Use
  `host.mcp.shell.zsh`,
  `docs/workspace/mcp/zsh-shell-mcp-capability-planning.md`,
  `docs/workspace/templates/capability-request.zsh-shell-mcp.example.json`, and
  `docs/workspace/templates/zsh-shell-mcp-operator-evidence.template.json`.
- **Candidate gate** — Desktop Commander MCP clears the explicit 1000+ GitHub
  star threshold, but it is third-party and not an official MCP addition or
  endorsement. Lower-star shell MCP candidates should be rejected unless a
  future plan changes the gate.
- **Host shell boundary** — Desktop Commander exposes broad host terminal,
  filesystem, and process controls. Treat defaultShell state,
  allowedDirectories state, command output, host file/process access, Codex
  config, npm state, Docker state, and remote MCP state as operator context
  only, never verifier input.
- **Zsh quoting** — when documenting inline `node -e` commands for zsh,
  single-quote the Node program so JavaScript template literals such as
  `${p.profileId}` reach Node unchanged.
- **Workspace verifier** — self-contained Capability Request JSON only. Do not
  auto-install, auto-start, configure MCP, launch Docker, access secrets, read
  shell history, store command transcripts with credentials, schedule work,
  start daemons, activate live adapters, write `_bmad/custom`, or treat
  Desktop Commander runtime state as declared capability compatibility.

When the user says "use PostgreSQL MCP", "use Postgres MCP", "use Docker Hub
PostgreSQL MCP", or names `modelcontextprotocol/server-postgres`, separate the
surfaces before authoring:

- **PostgreSQL read-only MCP** — optional/operator-provided database evidence
  only. Use `host.mcp.postgresql.readonly`,
  `docs/workspace/mcp/postgresql-mcp-capability-planning.md`, and
  `docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`.
- **Reference provider** — `modelcontextprotocol/server-postgres` is
  archived/deprecated reference metadata, not endorsement. The BMAD-owned
  interface name is `readonly-postgresql-mcp`.
- **Runtime secret state** — record only `POSTGRES_URL=set|unset`; never read,
  display, store, screenshot, log, or serialize the connection string value.
- **Read scope** — read-only is not safe. Require least-privilege database
  scope, allowed schemas/tables, denied writes, and why DB evidence is needed
  before citing PostgreSQL query evidence.
- **Workspace verifier** — self-contained Capability Request JSON only. Live
  PostgreSQL, Docker, MCP, network, Codex config, local MCP config,
  `_bmad/custom`, Workspace Session artifacts, and query results are not
  verifier input.

Because this `bmad-customize` source skill has no exposed `customize.toml`,
PostgreSQL MCP capability behavior changes require source/docs edits, not
central config. Customize may add reminders through exposed persistent facts
only; those reminders must not affect verifier pass/fail.

## Browser Affordance Authoring

When the user says "use Playwright MCP", "use Playwright", "use Agent Browser",
"use Browser Use", "use Computer Use", or asks for browser-aware Customize
planning, treat those tools as advisory affordances only. Browser affordances
may help an operator inspect, test, screenshot, navigate, or summarize UI state;
they are not sealed verifier evidence and not verifier authority.

Separate the surfaces before authoring:

- **Playwright MCP** — the official `@playwright/mcp` browser automation server.
  It may provide navigation, accessibility snapshots, clicks, typing,
  screenshots, and optional tool groups to an operator. Its live availability is
  not Workspace verifier authority.
- **Playwright CLI** — terminal-driven browser automation, including wrapper
  scripts. Command output is manual evidence only when an operator records it.
- **Agent Browser** — CLI browser automation with refs, snapshots, screenshots,
  and interaction loops. Local `PATH` availability is operator context only.
- **Browser Use** — browser automation provider or plugin context. Provider
  state, sessions, and cloud browser availability are not Workspace authority.
- **Computer Use** — desktop/UI automation MCP context. Live app accessibility
  state is not verifier input.
- **Workspace evidence path** — browser-derived observations may be recorded as
  manual result/review/closeout evidence with timestamp, source/tool, operator
  context, summary, artifact refs, and an explicit "not verifier input"
  boundary.
- **Sealed verifier evidence** — only the self-contained Capability Request JSON
  and declared capability entries passed to `bmad workspace verify-capability`.

Use browser affordance facts to improve guidance, examples, warnings, prompts,
and evidence checklists. Do not make deterministic validators or
`bmad workspace verify-capability` call live browser tools, read local browser
tool config, read MCP host config, probe the network, or infer runtime
availability. Do not use `_bmad/custom/*.toml` to declare Playwright MCP,
Playwright CLI, Agent Browser, Browser Use, or Computer Use availability, grant
authority, runtime authority, verifier compatibility, or environment truth.
Profile or registry work for browser affordances requires a separate
architecture decision; it is not a `bmad-customize` v1 output.

When the user says "use Google Calendar", "use Calendar MCP", "use Google
Workspace MCP", or mentions a local Google Workspace add-on target repo,
separate the surfaces before authoring:

- **Calendar MCP** — the official Google Calendar remote MCP surface. Use
  `host.mcp.google-calendar.remote` and
  `docs/workspace/templates/capability-request.google-calendar-mcp.example.json`.
- **Google Workspace docs MCP** — official documentation context only, never
  live Calendar account access or verifier authority.
- **Calendar API** — REST API and resource planning context only; API
  enablement is not verifier proof.
- **Codex Google Calendar connector** — Codex operator context only, not
  official Calendar MCP proof and not Workspace authority.
- **Workspace verifier** — self-contained Capability Request JSON only.
- **Target repo** — local Google Workspace add-on target repo planning context
  only unless implementation is explicitly approved; `appsscript.json`, add-on
  triggers, deploy state, and advanced services never prove verifier
  compatibility.

Use `docs/workspace/mcp/google-calendar-capability-planning.md` as the source
register and boundary map. Because this `bmad-customize` source skill has no
exposed `customize.toml`, Google Calendar capability behavior changes require
source/docs edits, not `_bmad/custom`. Customize may add per-skill reminders
through exposed `persistent_facts` only. It must not ask the user to paste
tokens, secrets, client IDs, or local OAuth setup as verifier proof. Name the
indirect prompt injection risk and require human review before any
Calendar-affecting action.
If a Graphify request includes command claims, explain that `commandEvidence`
is informational operator evidence only and use
`uv tool run --from graphifyy graphify ...` for separate smoke checks against a
Graphify-native node-link fixture (`nodes[]` and `links[]`). Do not use
`_bmad/custom/*.toml` to declare command availability, grant authority, or make
`verify-capability` execute commands. Codex manual executor readiness is
human-mediated/manual and is not a guarantee that a runnable local Codex CLI
exists.

Use a per-skill authoring override example only when the target skill exposes
the field in `customize.toml`:

```toml
# _bmad/custom/bmad-agent-dev.toml
[agent]
persistent_facts = [
  "When authoring Workspace Capability Requests, use docs/workspace/capability-profile-registry.json as advisory context only; pass self-contained JSON to verify-capability."
]
```

This teaches an agent how to author requests. It does not create verifier trust,
capability declarations, central config, grants, or runtime availability.

For Capability Evidence Gate Closeout, Customize may add local reminders to
exposed per-skill surfaces such as `bmad-agent-dev`, `bmad-quick-dev`, or
`bmad-code-review`. Use `_bmad/custom/*.toml` only as ignored/local agent or
workflow instruction. It is authoring and education only, never verifier
authority, and never central capability config. These reminders are never verifier authority.

Do not make `bmad workspace verify-capability` read `_bmad/custom`, hand-authored
TOML, local Codex config, project `.codex/config.toml`, app-server APIs, live MCP output,
live Graphify output, or Workspace Session artifacts. The verifier accepts a
self-contained Capability Request JSON fixture and returns a declared contract
verdict. If the user wants central capability declaration generation, say that
central config is outside bmad-customize v1 and point to the Workspace Capability
Contract docs and the template.

## Preflight

- No `{project-root}/_bmad/` → BMad isn't installed. Say so, stop.
- `{project-root}/_bmad/scripts/resolve_customization.py` missing → continue, but Step 6 verify falls back to manual merge.
- Both present → proceed.

## Activation

Load `_bmad/config.toml` and `_bmad/config.user.toml` from `{project-root}` for `user_name` (default `BMad`) and `communication_language` (default `English`). Greet. If the user's invocation already names a target skill AND a specific change, jump to Step 3.

## Step 1: Classify intent

- **Directed** — specific skill + specific change → Step 3.
- **Exploratory** — "what can I customize?" → Step 2.
- **Audit/iterate** — wants to review or change something already customized → Step 2, lead with skills that have existing overrides; read the existing override in Step 3 before composing.
- **Cross-cutting** — could live on multiple surfaces → Step 3, choose agent vs workflow explicitly with the user.

## Step 2: Discovery

```
python3 {skill-root}/scripts/list_customizable_skills.py --project-root {project-root}
```

Use `--extra-root <path>` (repeatable) if the user has skills installed in additional locations.

Group the returned `agents` and `workflows` for the user; for each show name, description, whether `has_team_override` or `has_user_override` is true. Surface any `errors[]`. For audit/iterate intents, lead with already-overridden entries.

Empty list: show `scanned_roots`, ask whether skills live elsewhere (offer `--extra-root`); otherwise stop.

## Step 3: Determine the right surface

Read the target's `customize.toml`. Top-level `[agent]` or `[workflow]` block defines the surface.

If a team or user override already exists, read it first and summarize what's already overridden before composing.

**Cross-cutting intent — walk both surfaces with the user:**

- Every workflow a given agent runs → agent surface (e.g. `bmad-agent-pm.toml` with `persistent_facts`, `principles`).
- One workflow only → workflow surface (e.g. `bmad-create-prd.toml` with `activation_steps_prepend`).
- Several specific workflows → multiple workflow overrides in sequence, not an agent override.

**Single-surface heuristic:**

- Workflow-level: template swap, output path, step-specific behavior, or a named scalar already exposed (`*_template`, `on_complete`). Surgical, reliable.
- Agent-level: persona, communication style, org-wide facts, menu changes, behavior that should apply to every workflow the agent dispatches.

When ambiguous, present both with tradeoff, recommend one, let the user decide.

Intent outside the exposed surface (step logic, ordering, anything not in `customize.toml`): say so; offer `activation_steps_prepend`/`append` or `persistent_facts` as approximations, or recommend `bmad-builder` to create a custom skill.

## Step 4: Compose the override

Translate plain-English into TOML against the target's `customize.toml` fields. If an existing override was read, frame the change as additive.

Merge semantics:

- **Scalars** (`icon`, `role`, `*_template`, `on_complete`) — override wins.
- **Append arrays** (`persistent_facts`, `activation_steps_prepend`/`append`, `principles`) — team/user entries append in order.
- **Keyed arrays of tables** (menu items with `code` or `id`) — matching keys replace, new keys append.

Overrides are sparse: only the fields being changed. Never copy the whole `customize.toml`.

**Template swap** (`*_template` scalar): offer to copy the default template to `{project-root}/_bmad/custom/{skill-name}-{purpose}-template.md`, point the override at the new path, offer to help edit it.

## Step 5: Team or user placement

Under `{project-root}/_bmad/custom/`:

- `{skill-name}.toml` — team, committed. Policies, org conventions, compliance.
- `{skill-name}.user.toml` — user, gitignored. Personal tone, private facts, shortcuts.

Default by character (policy → team, personal → user), confirm before writing.

## Step 6: Show, confirm, write, verify

1. Show the full TOML. If the file exists, show a diff. Never silently overwrite.
2. Wait for explicit yes.
3. Write. Create `{project-root}/_bmad/custom/` if needed.
4. Verify:

   ```
   python3 {project-root}/_bmad/scripts/resolve_customization.py --skill <install-path> --key <agent-or-workflow>
   ```

   Show the merged output, point out the changed fields.

   **Resolver missing or fails:** read whichever layers exist — `<install-path>/customize.toml` (base), `{project-root}/_bmad/custom/{skill-name}.toml` (team), `{project-root}/_bmad/custom/{skill-name}.user.toml` (user) — apply base → team → user with the same merge rules (scalars override, tables deep-merge, `code`/`id`-keyed arrays merge by key, all other arrays append), describe how the changed fields resolve.

   **Verify shows override didn't land** (field unchanged, merge conflict, file not picked up): re-enter Step 4 with the verify output as context. Usually wrong field name, wrong merge mode (scalar vs array), or wrong scope.

5. Summarize what changed, where the file lives, how to iterate. Remind the user to commit team overrides.

## Complete when

- Override file written (or user explicitly aborted).
- User has seen resolver output (or manual fallback merge summary).
- User has acknowledged the summary.

Otherwise the skill isn't done — finish or tell the user they're exiting incomplete.

## When this skill can't help

- **Central config** (`{project-root}/_bmad/custom/config.toml`) — see the [How to Customize BMad guide](https://docs.bmad-method.org/how-to/customize-bmad/).
- **Step logic, ordering, behavior not in `customize.toml`** — open a feature request, or use `bmad-builder` to create a custom skill. Offer to help with either.
- **Skills without a `customize.toml`** — not customizable.
