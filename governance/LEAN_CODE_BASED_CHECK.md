# Lean Code-Based Check

Default project execution uses code-based checks.

## Canonical Policy: CODE_BASED_LEAN Default

The default execution model for all tasks is **CODE_BASED_LEAN**. Normal implementation is live-code first and token-efficient.

### Core Rules
- **Live-Code First**: Inspect only the directly relevant code paths. Reuse existing code first. Avoid adding unnecessary abstractions, files, or dependencies.
- **Smallest Safe Diff**: Implement the smallest correct change that solves the task.
- **No Screenshots by Default**: Normal UI fixes, components, and layout work do not require screenshots, recordings, or visual evidence by default.
- **No Handoff/Evidence Packs by Default**: Do not generate evidence packs, handoff ZIP archives (`_HANDOFF.zip`), or command logs unless explicitly requested or required by specific escalation rules.
- **No Full Checks by Default**: Do not run full repository typecheck, test suites, builds, Nx graphs, or Graphify scans by default. Only run targeted code-based validation for the touched/affected files when useful and available.

---

## Escalation Rules

Create evidence files (including screenshots, logs, or handoff packs) only when:
- High-risk work is involved (WLT/finance, security, auth, privacy, secrets, database migrations, runtime/Docker environment changes).
- Destructive operations, broad refactoring, public contract/OpenAPI changes, or dependency upgrades are performed.
- Preparing for a PR, merge, or release readiness check.
- Specifically requested by the user.

---

## Token-Drain Exclusions

To maximize token efficiency and avoid scanning massive generated, temporary, or third-party assets, all tools and scans MUST ignore the following paths:

### Excluded Directories
- `.git/` (Git repository metadata)
- `node_modules/` (Third-party dependencies)
- `.pnpm-store/` (Local package cache)
- `.next/` (Next.js build cache and output)
- `.expo/` (Expo build cache and metadata)
- `.turbo/` (Turborepo execution cache)
- `.nx/` (Nx cache and metadata)
- `.cache/` (General tools/bundler cache)
- `dist/` (Build output)
- `build/` (Build output)
- `out/` (Static export output)
- `coverage/` (Test coverage reports)
- `tmp/` / `temp/` (Temporary files)
- `logs/` (System/execution logs)
- `graphify-out/` (Graphify metadata and outputs)
- `tools/registry/runs/` (Execution/agent logs and telemetry)
- `evidence/` / `**/evidence/` (Stored evidence packs)
- `**/screenshots/` (Saved screenshots)
- `**/recordings/` (Saved screen recordings)
- `**/visual-evidence/` (Saved visual assets)
- `**/generated/` / `**/__generated__/` (Auto-generated code/clients)
- `android/` / `ios/` (Mobile platform directories, except when executing native tasks)

### Excluded File Extensions & Patterns
- Media & Binary files: `*.png`, `*.jpg`, `*.jpeg`, `*.webp`, `*.gif`, `*.svg`, `*.ico`, `*.mp4`, `*.mov`, `*.avi`, `*.pdf`
- Archive files: `*.zip`, `*.7z`, `*.rar`, `*.tar`, `*.gz`
- Map files: `*.map`
- Minified scripts: `*.min.js`
- Lockfiles (except dependency-specific tasks): `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`

---

## Document Link & Ignore File Policy

### Repo-Relative Links
- All links inside committed repository documents (governance, agents, skills, and codebases) must be **repo-relative** (e.g., `../governance/LEAN_CODE_BASED_CHECK.md`).
- **NEVER** commit Windows or machine-local file scheme links (e.g., `file:///C:/...` or `file:///c:/...`).

### Ignore File Alignment
- All project ignore configurations (`.graphifyignore`, `.aiderignore`, `.cursorignore`, `.aiexclude`) and automated guard exclusions must fully align with the **Token-Drain Exclusions** defined in this document.
