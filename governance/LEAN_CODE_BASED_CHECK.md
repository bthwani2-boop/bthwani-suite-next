# Lean Code-Based Check

Default project execution uses code-based checks.

Normal implementation should inspect the relevant code, make the smallest safe live-code change, and run only a narrow check for the touched owner when useful.

Evidence packs, screenshots, handoff archives, broad repository checks, Graphify/Nx output, runtime logs, and full build/test/typecheck are reserved for high-risk work, final closure, PR/release readiness, runtime claims, or direct user request.
