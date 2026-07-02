# Graphify Policy

Graphify is a project context and relationship tool.

## Use Graphify when

- file ownership is unclear
- import/export impact is unclear
- cross-service or cross-surface linkage is unclear
- a journey touches many directories
- a donor extraction needs relationship comparison
- the user asks for graph-based analysis

## Do not use Graphify as

- final acceptance evidence
- replacement for `git diff`
- replacement for tests, type checks, runtime logs, or screenshots
- authority to modify files without a scoped task

## Project-scoped integration

The package includes a BThwani `graphify` skill wrapper. The official Graphify installer may update or add platform-specific files. After installation, review the generated diff before committing.

## Preferred flow

1. Build or refresh the graph only when graph context is needed.
2. Query the graph for a narrow question.
3. Use repository files as source evidence.
4. Verify changes with Git and the task-specific gate.
