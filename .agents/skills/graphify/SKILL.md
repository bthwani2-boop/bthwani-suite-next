# Graphify Skill

Status: `PROJECT_SHARED_WRAPPER`

Graphify is a local code-relationship and knowledge-graph tool. It is a CLI plus an assistant skill; it is not an autonomous agent and it is never final acceptance evidence.

## Authority and locations

The repository-owned shared wrapper is:

    .agents/skills/graphify/SKILL.md

The official installer writes platform integrations to the detected assistant's standard user-level or platform-level location, for example:

    %USERPROFILE%\.claude\skills\graphify\

That global installation is machine integration, not a repository duplicate. `graphify install` does not write to `.agents` because `.agents` is a BThwani-specific project convention rather than a Graphify platform target.

Do not replace this repository wrapper with an installer-generated vendor copy without reviewing the semantic diff.

## Official package and executables

- Package: `graphifyy`
- CLI: `graphify`
- MCP executable: `graphify-mcp`

Machine installation on Windows:

    uv tool install graphifyy
    uv tool update-shell
    graphify --version

Register the assistant skill with detected assistants:

    graphify install

Register one supported assistant only:

    graphify install --platform <name>

Examples of platform names include `claude`, `cursor`, `codex`, `gemini`, `aider`, and `devin` when those assistants are installed and detectable.

## Build or refresh the graph

Graph construction runs inside a supported AI coding assistant, not as a PowerShell slash command:

    /graphify .
    /graphify . --update
    /graphify . --mode deep

Do not type `/graphify .` directly into PowerShell. In PowerShell, use the terminal CLI only for installation, verification, and reading an existing graph.

## Terminal commands after graph creation

From the repository root:

    graphify --version
    graphify query "<question>"
    graphify path "<source>" "<target>"
    graphify explain "<symbol-or-node>"

These commands read `graphify-out/graph.json`; they do not replace the assistant-side graph build.

## Outputs

Graphify writes:

    graphify-out/
      graph.html
      GRAPH_REPORT.md
      graph.json

## When to use

Use Graphify before broad work where relationship evidence is materially useful, including:

- architecture and ownership analysis
- import/export impact
- service boundaries
- DSH/WLT links
- multi-surface flows
- duplicated logic and dead-code investigation
- risky move, delete, merge, or refactor decisions
- broad route or navigation impact

Graphify remains optional for narrow implementation where direct repository evidence is sufficient.

## Evidence and safety

Graphify output is impact guidance only. Final truth remains repository files plus task-specific verification such as Git diff, type checking, tests, runtime evidence, API checks, and UI-flow verification.

Before changing code:

1. Pin the correct repository, branch, and commit.
2. Use the graph only to narrow the investigation.
3. Verify each relevant claim against repository files.
4. Review generated or installer-written files before committing.

## Single-skill rule

Use only this repository-owned shared wrapper under `.agents`.

Do not create repository-local duplicates under:

    .claude/skills/graphify
    .gemini/skills/graphify

User-level integrations outside the repository, such as `%USERPROFILE%\.claude\skills\graphify`, are allowed because they are machine configuration and are not committed as parallel project authority.
