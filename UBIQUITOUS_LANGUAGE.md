# Ubiquitous Language

BMAD uses this glossary to keep delivery language, configuration authority, and
implementation capability aligned. Authority boundaries decide what may be
changed. Coding, tooling, TDD, and Codex capabilities describe how valid work is
performed and proven inside those boundaries.

## Delivery method

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Stories** | delivery | Bounded implementation slices that describe one user or operator outcome. | Story file, linked acceptance criteria, implementation notes. | Tasks, prompts, chores |
| **Epics** | delivery | Larger delivery containers that group related stories and preserve product intent. | Epic record, story links, dependency notes. | Buckets, themes |
| **Acceptance Criteria** | delivery | Observable conditions that define done for a story, artifact, or run. | Passing checks, review notes, command output. | Done list, checklist |
| **Implementation Readiness** | delivery | The gate that confirms requirements, architecture, risks, and tests are clear enough for execution. | Readiness decision, blockers, chosen workflow. | IR, readiness vibe |
| **Quality Gate** | delivery | The final deterministic check set required before handoff, commit, install, or push. | Exact command output from the exact checkout. | Final glance, quick check |

## Config authority

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Config Authority** | config | Permission to treat a configuration source as controlling BMAD behavior for a stated scope. | BMAD artifact, repo rule, grant, or validated policy reference. | Tool setting, local preference |
| **Config Precedence** | config | The ordered rule stack used when instructions, policies, skills, and local settings interact. | Cited source order and conflict resolution notes. | Whichever file loaded last |
| **Authority Boundary** | config | The line between what a setting can help with and what it is allowed to decide. | Boundary statement plus the source that grants or denies authority. | Permission mood, implicit approval |
| **Deterministic Validation** | config | A repeatable check that accepts or rejects a config, glossary, skill, or planning claim. | Stable command, stable diagnostic code, reproducible output. | Manual confidence |
| **Ownership Rule** | config | The rule that durable BMAD changes must be owned by the correct artifact, grant, branch, and reviewer path. | Owner record, diff, review surface, or explicit skip rationale. | Whoever touched it |

## Coding workflow

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Coding Capability** | coding | The practical ability to inspect code, edit files, run commands, and produce a reviewable diff. | Git status, changed files, tests or targeted validation. | Authority, policy |
| **Public Behavior Test** | coding | A test that exercises the supported interface or observable CLI behavior rather than internals. | Failing RED output and later passing GREEN output. | Private unit poke, shape test |
| **Small Diff** | coding | A scoped change set that solves the accepted behavior without unrelated churn. | Focused git diff and changed-file summary. | Rewrite, cleanup pass |
| **Reviewer-Ready Note** | coding | The concise handoff that names intent, evidence, residual risk, and reviewer focus. | Final report, PR body, or checkpoint note. | Victory lap, vague summary |
| **Local Verification** | coding | Commands run in the current checkout to prove the diff works before handoff. | Command names, exit status, and relevant output. | Looks good locally |

## TDD workflow

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **TDD Workflow** | tdd | The RED, GREEN, REFACTOR loop used to grow behavior through tests first. | Ordered test evidence for each vertical slice. | Test later, bulk test plan |
| **RED** | tdd | The failing public behavior test that proves the current system lacks the desired behavior. | Failing command and stable assertion or diagnostic. | Expected failure without proof |
| **GREEN** | tdd | The smallest implementation that makes the current RED behavior pass. | Passing targeted command after the implementation. | Broad rewrite |
| **REFACTOR** | tdd | Cleanup performed only after tests pass, preserving the proven behavior. | Passing tests before and after cleanup. | Opportunistic redesign |
| **Test-First Delivery** | tdd | Delivery discipline that refuses implementation edits until a relevant public test fails. | RED output captured before the first behavior change. | Test eventually |
| **Observable Public Behavior** | tdd | The user-facing or operator-facing behavior a test can see through supported commands, files, or docs. | CLI output, generated artifact, rendered docs, or public file contract. | Internal shape |

## Tooling workflow

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Tooling Capability** | tooling | The ability to run, inspect, validate, or propose tool and config changes inside BMAD constraints. | Command output, diff, and cited constraints. | Tool authority |
| **npm Quality** | tooling | The repo-defined quality script that mirrors the checks expected before push. | `npm run quality` output from the exact checkout. | CI maybe, local smoke |
| **Skill Validation** | tooling | Deterministic validation of BMAD skill files against documented repository rules. | `npm run validate:skills` output and validator diagnostics. | Skill lint vibes |
| **CI Parity** | tooling | Local checks matching the repository quality workflow closely enough to predict CI behavior. | Local command list mapped to workflow checks. | CI optimism |
| **Deterministic Command** | tooling | A command whose inputs, target checkout, and expected diagnostics can be repeated by a reviewer. | Command string, cwd, exit code, and stable output. | Magic command |

## Agentic search

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Agentic Search** | search | Search behavior where the agent decides whether context is needed, which context source to inspect, which search tool to call, what parameters to send, and whether results are sufficient. | Tool call record, query or command, inspected result, and stop or retry decision. | Automatic retrieval, simple lookup |
| **Context Source** | search | Any place relevant information may live, including local files, skills, databases, web pages, memory, scratchpads, APIs, or CLI-accessible systems. | Named source, access path, and authority boundary. | Database when broader sources are possible |
| **Search Tool** | search | A callable tool the agent uses to retrieve, inspect, filter, aggregate, or validate information from a context source. | Tool name, description, parameters, and response. | Retriever, magic tool |
| **Retrieved Context** | search | Information returned by a search tool and considered for inclusion in the agent or LLM context window. | Tool response excerpt, relevance note, and source reference. | Data, truth |
| **Context Curation** | search | Selecting, filtering, transforming, compressing, or discarding retrieved context before it enters the context window. | Kept or discarded result note, summary, and reason. | Dumping results |
| **Trigger Condition** | search | The condition that tells the agent when a search tool should be used for a request. | Tool description, rule, example, or acceptance criterion. | When to use it |
| **Negative Trigger Condition** | search | The condition that tells the agent when a search tool should not be used, especially when another context source is authoritative. | Tool description, rule, example, or acceptance criterion. | Caveat, exception |
| **Parameter Complexity** | search | The difficulty of producing valid search inputs, from simple natural-language strings to full query languages or shell commands. | Parameter schema, examples, validator, or error response. | The model is bad at tools |
| **Zero-result Ambiguity** | search | The case where empty search results may mean either no answer exists or the search failed through bad source choice, syntax, filters, or indexing. | Empty result plus retry, alternate tool, or validation note. | No answer |

## Codex and agent capability

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Codex Executor** | agent | The operator that reads BMAD prompts, edits files, runs tools, and reports evidence under BMAD constraints. | Git diff, command output, and final handoff. | Owner, authority source |
| **Agent Capability** | agent | A bounded ability available to an agent, such as file edits, terminal commands, browser checks, subagents, or documentation lookup. | Tool result, enabled surface, and any applicable constraint. | Permission, guarantee |
| **Tool Affordance** | agent | A UI, command, hook, subagent, MCP tool, plugin, or config option that helps work happen. | Tool availability plus use evidence. | Grant, approval, policy |
| **Sandbox Boundary** | agent | The filesystem, network, and command limits that constrain local execution for a run. | Current sandbox settings and any failed or blocked command. | Security proof, BMAD grant |
| **Approval Policy** | agent | The local action-review setting that controls whether Codex pauses before certain operations. | Current policy value and observed approval behavior. | Ownership, config authority |
| **Blocker Surface** | agent | The explicit point where work stops because authority, evidence, tools, or environment state is missing. | Blocker message, failed command, or missing source citation. | Silent assumption |

## Evidence gates

| Term | Scope | Definition | Evidence Required | Aliases to avoid |
| --- | --- | --- | --- | --- |
| **Evidence Gate** | validation | A required proof point before work may proceed, finish, install, refresh, commit, or push. | Named gate, command output, and decision. | Trust me, checkpoint vibe |
| **Validation Evidence** | validation | The recorded result from a deterministic validator, test, lint, build, or quality command. | Command, cwd, exit code, and meaningful diagnostics. | Confidence |
| **Exact Checkout Gate** | validation | The rule that final quality must run against the same HEAD and worktree being handed off. | `git rev-parse HEAD`, git status, and quality output. | Close enough |
| **Checkpoint Evidence** | validation | Durable run notes that preserve decisions, failures, commands, branch, and continuation status. | Checkpoint file path and relevant content. | Chat memory |
| **Install Evidence** | validation | Proof that generated BMAD outputs or skill installations were built or updated when required. | Installer command, manifest row, and source or installed hash. | Assumed install |
| **Refresh Evidence** | validation | Proof that the active operator surface can see the installed or updated skill/config state. | Reload result, active hash, or explicit unknown/blocked status. | Hot reload claim |
| **Session Identity** | validation | Classification of a supplied session or thread id before it is used as workspace evidence. | Lookup output, classification, and fallback state evidence. | Session guess |

## Relationships

- Authority boundaries constrain capability work: a Codex Executor may inspect,
  propose, edit, validate, and explain within the approved scope, but durable
  BMAD authority still comes from BMAD artifacts, grants, repo rules, and
  deterministic validation.
- Coding, tooling, TDD, and Codex terms produce evidence by turning each claim
  into an observable command, diff, test result, checkpoint, or reviewer-ready
  note.
- Config authority is one peer domain. It protects ownership and precedence, but
  it does not replace delivery, coding, tooling, TDD, agent, or validation
  vocabulary.
- Agentic Search context tools may inform a Codex Executor, but retrieved
  context does not become verifier input or Workspace authority without a
  declared BMAD artifact, contract, test, or quality gate.
- SESSION_NOT_FOUND means workspace session lookup failed; do not infer repo state from it. Re-establish state from git status, files, and test output.

## Example dialogue

> **Bad authority claim:** "This local tool setting lets me mutate the BMAD
> Workspace whenever a run seems useful."
>
> **Good tooling guidance:** "I can inspect the local setting, propose a
> config diff, run deterministic validation, and explain the result. BMAD
> artifacts, grants, repo rules, and review evidence decide whether the change
> may persist."
>
> **Dev:** "Can you start by rewriting the glossary?"
>
> **Codex Executor:** "First I will add a Public Behavior Test that fails
> against the current glossary. After RED is captured, I will make the smallest
> glossary and validator changes needed for GREEN, then refactor only while the
> targeted tests are passing."
>
> **Reviewer:** "What should I check?"
>
> **Codex Executor:** "The Reviewer-Ready Note maps files to acceptance
> criteria, includes RED and GREEN evidence, names validator codes, records the
> final quality command, and calls out residual risk."

## Flagged ambiguities

- "config" can mean BMAD policy, repo instructions, local Codex settings, or
  generated tool config. Use **Config Authority** only when a cited source may
  decide behavior for a stated scope.
- "authority" can mean approval, ownership, precedence, or tool access. Use
  **Authority Boundary** for what may be decided.
- "capability" can mean what an agent can physically do or what BMAD permits.
  Use **Coding Capability**, **Tooling Capability**, or **Agent Capability** for
  practical ability, then cite the authority source separately.
- "agent" can mean the **Codex Executor**, a BMAD role, or a parallel helper.
  Name the exact role and its allowed scope.
- "hook" can mean a local lifecycle command or a governance step. Treat hooks as
  **Tool Affordances** unless a BMAD artifact grants authority.
- "quality" can mean `npm run quality`, a review judgment, or CI status. Use
  **npm Quality** for the repo script and **Quality Gate** for the handoff gate.
- "search" can mean exact file search, semantic search, web lookup, database
  query, memory retrieval, skill loading, or shell inspection. Use
  **Agentic Search** only when the agent chooses the source, tool, parameters,
  and sufficiency decision.
- "validation" can mean a deterministic command or a reviewer opinion. Use
  **Deterministic Validation** and record **Validation Evidence**.
- "install" can mean dependency install, generated skill install, or user-scope
  activation. Use **Install Evidence** and name the target.
- "refresh" can mean app reload, skill discovery, or a new thread. Use
  **Refresh Evidence** and record known, failed, blocked, or unknown state.
- "evidence" can mean command output, a checkpoint, a diff, or a citation. Use
  the narrowest evidence term that proves the claim.
- "session" can mean a Codex thread, BMAD Workspace Session, shell process, or
  runtime job. Use **Session Identity** before relying on a supplied id.
