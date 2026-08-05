# Graphify Policy

Graphify is a conditional project-context and relationship tool. It helps narrow architectural investigation, but it owns no repository authority and provides no final closure proof.

## Repository integration model

BThwani keeps one project-owned Graphify wrapper at:

    .agents/skills/graphify/SKILL.md

The official `graphify install` command registers `/graphify` in the standard locations of assistants it detects. Those locations may be user-level, such as `%USERPROFILE%\.claude\skills\graphify`, and are intentionally outside the repository.

Therefore:

- absence of an installer write under `.agents` is expected
- the `.agents` wrapper is maintained by the repository
- global assistant copies are machine integrations, not project sources of truth
- installer-generated content must not silently replace the BThwani wrapper

## Installation boundary

Repository files do not install the executable. A working machine must separately provide:

    uv
    graphify
    graphify-mcp

Verification:

    uv --version
    uv tool list
    graphify --version

The package is `graphifyy`; the command is `graphify`.

## Correct execution boundary

Build or refresh the graph inside a supported AI coding assistant:

    /graphify .
    /graphify . --update
    /graphify . --mode deep

Use terminal commands only after `graphify-out/graph.json` exists, for example:

    graphify query "<question>"
    graphify path "<source>" "<target>"
    graphify explain "<node>"

Do not treat old terminal forms such as `graphify .` or `graphify update . --force` as authoritative without verifying compatibility with the installed Graphify version.

## Use Graphify when

- file ownership is unclear
- import/export impact is unclear
- cross-service or cross-surface linkage is unclear
- a journey touches many directories
- donor extraction needs relationship comparison
- duplicated logic or dead code is being investigated
- a risky structural refactor is proposed
- the user asks for graph-based analysis

## Do not use Graphify as

- final acceptance evidence
- replacement for repository reads
- replacement for `git diff`
- replacement for tests, type checks, runtime logs, API checks, or screenshots
- authority to modify files without a scoped task
- justification to create parallel project skills

## Preferred flow

1. Pin the exact repository, branch, and commit.
2. Build or refresh the graph only when graph context is required.
3. Query a narrow relationship question.
4. Confirm the result against repository files.
5. Apply scoped changes.
6. Verify through Git and the task-specific evidence gate.
