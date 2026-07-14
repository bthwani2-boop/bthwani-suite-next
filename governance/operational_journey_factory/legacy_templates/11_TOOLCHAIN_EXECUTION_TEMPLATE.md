# Toolchain Execution Template

<!-- markdownlint-disable MD060 -->

The tool table must be generated from package scripts, `tools/toolchain/tool-catalog.v5.json`, activation baseline, expected tool ids, guard registry, `tools/guards`, `tools/scripts`, `.github/workflows`, `LEAN-CTX.md`, Graphify files, and Knip config.

| Field | Required value |
|---|---|
| tool_id | Tool or guard id |
| detected_from | Source file or workflow |
| command | Command or external action |
| category | Contract, backend, frontend, security, workflow, runtime, performance, a11y, cleanup, graph, CI, or governance |
| activation | `active`, `partial`, `optional`, `missing`, or `unmapped` |
| failure_policy | fail, warn, manual, external, or block journey start |
| applies_to | Surface, feature, contract, runtime, or repository area |
| required_for | Journey phase where the tool is required |
| optional_when | Condition where it is optional |
| output_location | `.diagnostics/operational-journey-factory/` or external CI evidence |
| pass_condition | Current HEAD command success or justified external evidence |
| failure_action | Add gap, block journey start, or document external blocker |
| blocker_type_allowed | Allowed blocker class |

## Active Tool IDs That Must Be Represented

- `codeql`
- `sonarqube`
- `gitleaks`
- `trivy`
- `osv-scanner`
- `conftest`
- `markdownlint-cli2`
- `actionlint`
- `zizmor`
- `nx`

## Non-Exclusive Tool Sources

LeanCTX, Graphify, Knip, TypeScript, build/test/lint scripts, OpenAPI generation, backend API binding guard, frontend feature binding guard, service manifest drift guard, dependency graph guard, go routes guard, logic coverage guard, a11y guard, ui-provider guard, icon guard, design-token guard, ui-kit guard, Semgrep, OPA, Regal, pinact, shellcheck, hadolint, yamllint, ls-lint, jscpd, dependency-cruiser, madge, Sherif, Spectral, Playwright, axe, Storybook, visual tools, k6, autocannon, Lighthouse, size-limit, OpenTelemetry, Jaeger, Grafana, Prometheus, Expo/mobile guards, YAGNI diagnostics, git-sizer, syft, cyclonedx, checkov, and any existing package script or guard may apply when relevant.
