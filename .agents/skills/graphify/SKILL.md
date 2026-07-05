# Graphify Skill

Graphify is a CLI tool, not an agent.

Use it as the shared project knowledge-graph tool for Claude Code, Codex, Gemini CLI, and any other coding assistant working in this repository.

## Official CLI

Package: graphifyy
Command: graphify

## Required usage

From the repository root:

    graphify .

PowerShell rule: use graphify . not /graphify .

## Outputs

Graphify writes:

    graphify-out/
      graph.html
      GRAPH_REPORT.md
      graph.json

## When to use

Use Graphify before deep codebase work involving architecture, imports, exports, service boundaries, multi-surface flows, DSH/WLT links, duplicated logic, dead code, risky refactors, ownership decisions, and broad file discovery.

## Required for Deep Work

Graphify is optional for focused implementation, but mandatory before closure decisions involving:

- DSH/WLT links
- service boundaries
- shared brain ownership
- multi-surface flows
- control-panel + mobile app impact
- duplicated logic
- dead code
- risky move/delete/merge/refactor
- unclear import/export ownership
- broad route/navigation impact

Graphify output is impact guidance only. Final truth remains repo files + targeted verification.

## Token rule

Prefer focused graph outputs before reading many raw files. Use Graphify to reduce token waste, not to replace verification.

## Safety rule

Graphify output is analysis support only. It is not final truth.

Before changing code, verify with repo files, git status, git diff, diff check, and typecheck/test when relevant.

## Single-skill rule

This repository uses one shared Graphify skill only:

    .agents/skills/graphify/SKILL.md

Do not create duplicate Graphify skills under:

    .claude/skills/graphify
    .gemini/skills/graphify
