# Total Gap Discovery Protocol

<!-- markdownlint-disable MD060 -->

Every pass below requires command or tool, output location, expected findings, failure meaning, and required decision. A future journey cannot start until every relevant pass has a current result or a justified exclusion.

## Smart Journey Segmentation Rule

Journey boundaries must be selected by business outcome across the unified full-stack multi-surface flow, not by a single file, screen, tab, route, API operation, or tool finding. Split journeys only when outcome, owner boundary, state machine, WLT financial boundary, runtime proof path, or CI proof path differs. Merge findings when they belong to the same user or system outcome, state chain, backend/API/database truth, and affected surface set.

A single-surface journey is invalid unless every other surface has verified exclusion evidence.

| Pass | Command or tool | Output location | Expected findings | Failure meaning | Required decision |
|---|---|---|---|---|---|
| Git truth | `git rev-parse HEAD` and `git status --short` | inventory metadata | current SHA and dirty state | stale or mixed evidence | block or refresh evidence |
| LeanCTX context | `ctx_compose`, `ctx_tree`, `ctx_search`, `ctx_read` | planning notes or generator metadata | relevant code paths and governance paths | unresolved context | add `LEANCTX_UNRESOLVED_CONTEXT` gap |
| Repo tree | `ctx_tree` or generator file walk | `.diagnostics/operational-journey-factory/*.json` | apps, services, shared, contracts, tools | missing source topology | add scope gaps |
| Graphify architecture | `pnpm run graphify` when ownership or dependency impact is unclear | `.diagnostics` or Graphify output | ownership and edges | unresolved edge or stale graph | add `GRAPHIFY_UNRESOLVED_EDGE` gap |
| Nx project graph | `pnpm run nx:projects` or affected command | `.diagnostics` | project and target coverage | missing project mapping | block affected validation |
| Package scripts | `package.json` scan | toolchain inventory | scripts and guard commands | missing command binding | classify tool gap |
| Tool catalog | `tools/toolchain/*.json` scan | toolchain inventory | activation and failure policy | unmapped tool | classify tool gap |
| Workflow | `.github/workflows/*.yml` scan | toolchain inventory | CI references | unproven CI path | add `CI_NOT_PROVEN` gap |
| Service manifest | `services/**/service.manifest.ts` scan | journey inventory | ownership and service metadata | manifest drift | require drift check |
| Runtime map | `services/**/runtime-map.ts` scan | journey inventory | runtime entries and ports | runtime not mapped | add runtime gap |
| Capability map | `services/**/capability-map.ts` scan | journey inventory | feature capability ownership | unowned feature | assign owner |
| OpenAPI | `**/*.openapi.yaml` scan | journey inventory | operationIds and schemas | missing contract | add API gap |
| Generated client | `**/clients/generated/**` scan | journey inventory | typed client bindings | stale or missing client | regenerate or bind |
| Backend route | backend route scan and `guard:go-routes-ci` | journey inventory | route and handler mapping | missing backend route | implement or bind |
| Database and migration | migration and schema scan | journey inventory | table truth and migrations | missing DB truth | add database action |
| Frontend route and navigation | surface scan | surface inventory | pages, screens, navigation bindings | unbound UI entry | bind or retire |
| Shared brain | shared controller/view-model scan | surface inventory | shared logic ownership | local surface logic | move or bind shared |
| Surface UI | surface scan | surface inventory | components, sections, tabs | missing surface classification | block journey start |
| UI icon and component | surface scan plus UI guards | surface inventory | icons, buttons, forms, states | missing handler or a11y | add UI gap |
| State, permission, audit | guards and source scan | gap ledger | actor/action/state matrix | missing enforcement | block journey start |
| Knip | `knip` or stored diagnostics when available | `.diagnostics` | unused exports/files | unclassified dead code | decide keep/move/merge/delete |
| Duplication | `jscpd` or stored diagnostics when available | `.diagnostics` | duplicate logic/types | duplicated truth | merge or split |
| Dependency graph | dependency-cruiser, madge, Nx, or Graphify | `.diagnostics` | dependency direction | invalid ownership | fix or block |
| Security | Gitleaks, Trivy, OSV, CodeQL, Semgrep when active | `.diagnostics` or CI | exposed risk | security not proven | block sensitive journey |
| Performance and observability | k6, autocannon, Lighthouse, size-limit, OTEL tools when relevant | `.diagnostics` | capacity and telemetry | performance not proven | add blocker |
| Runtime smoke | runtime scripts only for runtime-scoped journey | runtime evidence outside Git | boot and live smoke | runtime not proven | do not claim live readiness |
| Gap ledger | `pnpm run diagnostics:operational:gaps` | `.diagnostics/operational-journey-factory/gap-ledger.*` | unified blockers | no ledger | block journey start |
| File decision | `03_ATOMIC_FILE_DECISION_TEMPLATE.md` | journey package later | keep/bind/move/merge/delete decision | unowned file/export/helper | block cleanup closure |
| Action plan | journey master template | journey package later | ordered actions and checks | incomplete plan | block execution |
| Closure checklist | evidence template and checklist | journey package later | current evidence matrix | docs-only closure | no closure claim |
