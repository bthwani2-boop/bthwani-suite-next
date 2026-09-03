# Security Policy

## Reporting

Report suspected vulnerabilities privately through GitHub Security Advisories when available, or through a private maintainer channel controlled by the repository owner.

Do not publish exploit details in public issues before a safe remediation path is established.

## Material security scope

Security-sensitive areas include, without creating preservation rights for their current topology:

- `core/identity/**`
- `services/dsh/**`
- `services/wlt/**`
- `infra/**`
- `.github/**`
- contracts, migrations, runtime/config and dependency changes that can alter trust boundaries

## `h` evidence rule

On branch `h`, security/auth/runtime/data/financial changes require evidence attributable to the exact current `h` candidate for the claims materially affected. GitHub Actions, scanners, tests and runtime probes are evidence producers only; skipped, stale, superseded or missing evidence is not PASS.

This policy does not define a PR/merge/READY lifecycle and does not override the canonical refoundation orchestrator. The `h` campaign uses direct authorized fast-forward mutation and the Stage-A/Stage-B verification/closure laws in `tools/prompting/bthwani-orchestrator/**`.

Security or financial truth must never be weakened merely to obtain green output. Destructive structural refoundation must preserve durable security/data/financial meaning, prove migration/cutover where applicable, and remove losing parallel authorities after cutover.
