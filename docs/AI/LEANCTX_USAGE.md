# LeanCTX Usage Policy — bthwani-suite-next

LeanCTX is an optional AI-agent context layer. Repository configuration makes agents aware of LeanCTX, but it does not install the `lean-ctx` executable on a developer machine.

## Installation state versus repository state

These repository files are integration declarations only:

    .github/mcp.json
    .vscode/mcp.json
    .lean-ctx.toml
    LEAN-CTX.md

A valid local installation must also satisfy:

    Get-Command lean-ctx -ErrorAction Stop
    lean-ctx --version

If those commands fail, LeanCTX is not installed in the active Windows environment even when the MCP JSON files exist.

## Windows installation

Install the prebuilt binary through npm:

    npm install -g lean-ctx-bin

Verify:

    Get-Command lean-ctx -ErrorAction Stop
    lean-ctx --version
    npm list -g lean-ctx-bin --depth=0

If npm's global executable directory is not available in the active shell, refresh `PATH` or restart the terminal and IDE before continuing.

## Agent integration

The repository is configured for agent-only usage and must not silently enable a proxy or broaden runtime behavior.

Preferred setup for one agent:

    lean-ctx init --agent <name> --mode mcp

Examples:

    lean-ctx init --agent codex --mode mcp
    lean-ctx init --agent gemini --mode mcp
    lean-ctx init --agent claude --mode mcp

For automatic multi-agent discovery, `lean-ctx onboard` is available, but it may modify shell hooks and global agent configurations. Review its changes and preserve the repository policy in `.lean-ctx.toml`:

- `shell_activation = "agents-only"`
- proxy remains disabled unless explicitly approved
- cloud contribution remains disabled

After installation or integration, restart the terminal and AI coding tools completely.

## Verification

Run:

    lean-ctx doctor
    lean-ctx doctor integrations
    lean-ctx status --json

Inside the agent, verify that the expected MCP tools are present before requiring their use.

## Preferred agent tools

When LeanCTX is active and connected:

- `ctx_compose`: orient before broad investigation
- `ctx_read`: read files with compact, structural, or exact modes
- `ctx_search` / `ctx_semantic_search`: locate code by pattern or meaning
- `ctx_tree` / `ctx_glob`: inspect project structure
- `ctx_shell`: run noisy commands with compressed output
- `ctx_callgraph`: inspect function-call and file-dependency relationships
- `ctx_session` / `ctx_knowledge`: recover session and project context

Do not claim LeanCTX was used merely because its policy files exist. Actual usage requires available `ctx_*` tools or successful `lean-ctx` command execution in the same environment as the agent.

## Rules

- Use LeanCTX to reduce token waste and improve navigation when it is available and useful.
- If LeanCTX is unavailable or insufficient, use the smallest safe native equivalent and state the limitation.
- Do not treat LeanCTX output as final proof of correctness.
- Final closure still requires real evidence: repository reads, Git diff, type checks, lint, tests, runtime, Docker/API checks, and UI-flow verification where relevant.
- For exact or raw output, use the relevant raw or bypass mode.
- Do not enable LeanCTX proxy or cloud contribution without explicit approval.
- Do not commit machine-specific global configuration as a parallel repository authority.

## Updating

For an npm installation:

    npm update -g lean-ctx-bin
    lean-ctx --version
    lean-ctx doctor integrations

Re-run the selected agent integration command only when the tool reports drift or the agent configuration changed.
