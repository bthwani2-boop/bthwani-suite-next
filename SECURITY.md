# Security Policy

## Reporting

Report suspected vulnerabilities privately through GitHub Security Advisories when available, or by opening a private maintainer channel for the repository owner.

Do not publish exploit details in public issues before maintainers confirm a fix path.

## Scope

Security-sensitive areas include:

- `core/identity/**`
- `services/dsh/**`
- `services/wlt/**`
- `infra/docker/**`
- `.github/workflows/**`

## Merge Rule

Security, auth, runtime, data, or financial changes must not be marked `READY` without passing required GitHub Actions checks on the exact commit SHA under review.
