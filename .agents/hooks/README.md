# BThwani Agent Layer Hooks

This directory contains portable PowerShell scripts used by Codex and Claude configuration adapters to verify tools and prevent command execution issues in the local environment.

- `graphify-hook-check.ps1`: Executed by Codex hooks to verify graphify availability without using hardcoded personal paths.
- `graphify-pretool.ps1`: Executed by Claude/Gemini hooks before running wide searches/greps to suggest context-aware Graphify queries.
