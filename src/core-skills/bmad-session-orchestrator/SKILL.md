---
name: bmad-session-orchestrator
description: 'Coordinates parallel agent sessions across skills and stories. Use when the user says "what can I run in parallel", "orchestrate sessions", "plan my sessions", or when using VS Code Agents app.'
---

# Session Orchestrator

## Overview

This skill reads sprint and memory state across the workspace and recommends which BMAD skills can run as parallel sessions. It is designed for the VS Code Agents app (v1.115+), which supports isolated worktree sessions with progress monitoring and diff review — but works with any multi-session workflow including multiple Copilot Chat tabs.

Follow the instructions in [workflow.md](workflow.md).

## Core Outcomes

- **Surface sprint position** — show all active, ready, and blocked stories at a glance.
- **Recommend parallel sessions** — identify which skills can safely run concurrently without artifact conflicts.
- **Generate session briefs** — produce per-session context blocks that each agent session can use as custom instructions.
- **Track session state** — persist active session metadata via `bmad-memory-manager` so the orchestrator can resume across conversations.

## Operating Rules

- **Read-only by default** — this skill reads state but does not execute other skills. It recommends; the user launches.
- **Conflict-aware** — two sessions must not write to the same output file. Flag conflicts before recommending parallel runs.
- **Sprint-status is canonical** — story state comes from `sprint-status.yaml`, not from memory or conversation.
- **Session state is advisory** — memory sidecars track what was recommended, not what actually happened. Always re-read sprint-status for ground truth.

## Recovery

If conversation context is compressed, re-read this file and [workflow.md](workflow.md). The session roster in `_bmad/_memory/session-orchestrator-sidecar/active-sessions.md` is the recovery surface.

## On Activation

- Load `sprint-status.yaml` to understand current story positions.
- Check `_bmad/_memory/` for any persisted session state.
- Present the session dashboard and wait for the user to choose an action.
