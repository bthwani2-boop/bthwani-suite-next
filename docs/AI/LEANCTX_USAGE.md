# LeanCTX Usage Policy — bthwani-suite-next

LeanCTX is available as an AI-agent context layer.

Preferred agent tools:
- ctx_read: read files with compact/cached modes.
- ctx_search / ctx_tree: locate relevant code before opening files.
- ctx_shell: run noisy commands with compressed output.
- ctx_overview / ctx_knowledge: recover project/session context.

Rules:
- Use LeanCTX to reduce token waste and improve navigation.
- Do not treat LeanCTX output as final proof of correctness.
- Final closure still requires real evidence: typecheck, lint, tests, runtime, Docker/API checks, and UI flow verification where relevant.
- For exact/raw output, use raw/bypass mode.
- Do not enable LeanCTX proxy unless explicitly approved.
