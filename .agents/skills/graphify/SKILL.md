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
