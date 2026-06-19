# Agent Restore Decision

Use this file when replacing an existing agent system with this package.

## Replace mode

Acceptable when:

- previous agent files contain duplicated global rules
- skill catalog is out of sync
- adapters became thick mirrors
- Graphify/project-tool integration is inconsistent
- current `.agents` is placeholder-only or contaminated by donor copy

## Restore method

1. Back up existing agent-related files.
2. Replace `.agents` from package payload.
3. Replace root entry files from package payload.
4. Replace tool-specific pointers from package payload.
5. Run the package verification script.
6. Review Git diff before commit.

## Never restore blindly

If local agent files contain uncommitted custom work, preserve backup under `tools/registry/runs/{SESSION_ID}/backup`.
