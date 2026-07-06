# Operational Toolchain Inventory

head_sha: `2ba18161c27654d970b16c51667756a0aa6a2716`
status: `DISCOVERY_ONLY`

| Tool | Activation | Command | Classification |
|---|---|---|---|
| `codeql` | active | `none` | WORKFLOW_ONLY, NEEDS_OWNER |
| `sonarqube` | active | `none` | WORKFLOW_ONLY, NEEDS_OWNER |
| `semgrep` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `gitleaks` | active | `guard:secrets` | NEEDS_OWNER |
| `trivy` | active | `security:trivy` | NEEDS_OWNER |
| `osv-scanner` | active | `security:osv` | NEEDS_OWNER |
| `opa` | partial | `guard:opa-policies` | PARTIAL, NEEDS_OWNER |
| `conftest` | active | `guard:opa-policies` | NEEDS_OWNER |
| `regal` | partial | `guard:rego-lint` | PARTIAL, NEEDS_OWNER |
| `ajv` | optional | `guard:governance-schema` | OPTIONAL, NEEDS_OWNER |
| `markdownlint-cli2` | active | `guard:markdown-governance` | NEEDS_OWNER |
| `actionlint` | active | `guard:workflow-lint` | NEEDS_OWNER |
| `zizmor` | active | `guard:workflow-security` | NEEDS_OWNER |
| `pinact` | partial | `guard:actions-pin` | PARTIAL, NEEDS_OWNER |
| `shellcheck` | partial | `guard:shellcheck` | PARTIAL, NEEDS_OWNER |
| `ls-lint` | partial | `guard:ls-lint` | PARTIAL, NEEDS_OWNER |
| `eslint` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `typescript` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `knip` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `jscpd` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `dependency-cruiser` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `madge` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `nx` | active | `nx:projects` | NEEDS_OWNER |
| `sherif` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `spectral` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `openapi-typescript` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `graphify` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `playwright` | partial | `e2e:web:smoke` | PARTIAL, NEEDS_OWNER |
| `axe` | partial | `guard:a11y-runtime` | PARTIAL, NEEDS_OWNER |
| `xstate` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `cucumber` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `storybook` | partial | `diagnostics:storybook` | PARTIAL, NEEDS_OWNER |
| `loki` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `reg-suit` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `opentelemetry` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `jaeger` | optional | `none` | OPTIONAL, WORKFLOW_ONLY, NEEDS_OWNER |
| `prometheus` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `grafana` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `k6` | optional | `none` | OPTIONAL, WORKFLOW_ONLY, NEEDS_OWNER |
| `autocannon` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `lighthouse-ci` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `size-limit` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `tamagui` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `cue` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `checkov` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `renovate` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `hadolint` | partial | `guard:dockerfile-lint` | PARTIAL, NEEDS_OWNER |
| `yamllint` | partial | `guard:yaml-lint` | PARTIAL, NEEDS_OWNER |
| `go-pprof` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `expo-atlas` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `style-dictionary` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `maestro` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `detox` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `lint-staged` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `husky` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `lefthook` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `git-sizer` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `syft` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `cyclonedx` | optional | `none` | OPTIONAL, NEEDS_OWNER |
| `next-bundle` | optional | `none` | OPTIONAL, NEEDS_OWNER |

## Unused Guard Or Diagnostic Scripts
- `diagnostics:codeql:local`: UNUSED_SCRIPT
- `diagnostics:sonarqube:config`: UNUSED_SCRIPT
- `diagnostics:go-routes`: UNUSED_SCRIPT
- `diagnostics:otel:smoke`: UNUSED_SCRIPT
- `diagnostics:tools`: UNUSED_SCRIPT
- `guard:logic-all`: UNUSED_SCRIPT
- `diagnostics:ui-kit`: UNUSED_SCRIPT
- `guard:repo-all`: UNUSED_SCRIPT
- `diagnostics:repo-structure`: UNUSED_SCRIPT
- `guard:performance-all`: UNUSED_SCRIPT
- `diagnostics:performance`: UNUSED_SCRIPT
- `guard:governance-all`: UNUSED_SCRIPT
- `diagnostics:tools:v5`: UNUSED_SCRIPT
- `diagnostics:operational:toolchain`: UNUSED_SCRIPT
- `diagnostics:operational:surfaces`: UNUSED_SCRIPT
- `diagnostics:operational:inventory`: UNUSED_SCRIPT
- `diagnostics:operational:gaps`: UNUSED_SCRIPT
- `diagnostics:trivy`: UNUSED_SCRIPT
- `diagnostics:osv`: UNUSED_SCRIPT
- `diagnostics:actions-pin`: UNUSED_SCRIPT
- `diagnostics:iac-security`: UNUSED_SCRIPT
- `diagnostics:git-sizer`: UNUSED_SCRIPT
- `diagnostics:sbom`: UNUSED_SCRIPT
- `diagnostics:sbom:cyclonedx`: UNUSED_SCRIPT
- `diagnostics:next-bundle`: UNUSED_SCRIPT
- `guard:tools-v5-all`: UNUSED_SCRIPT
- `diagnostics:state-machines`: UNUSED_SCRIPT
- `diagnostics:journey-scenarios`: UNUSED_SCRIPT
- `diagnostics:expo-atlas:client`: UNUSED_SCRIPT
- `diagnostics:style-dictionary`: UNUSED_SCRIPT
- `guard:tools-v5-registry`: UNUSED_SCRIPT
- `guard:tools-v5-ci`: UNUSED_SCRIPT