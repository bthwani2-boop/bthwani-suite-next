# Foundation-Only Refoundation Execution

Status: ACTIVE_CANONICAL

## Purpose

The `new` branch is the controlled refoundation workspace created from `abdo` at commit `98ab47dd59e5fc6f615cbe96094ec61fa0c8ffa3`.

This phase preserves and improves the proven engineering foundation before any product journey implementation begins. It is not a product-delivery phase and it must not be used to introduce journey behavior, business workflows, screens, APIs, database models, or domain truth.

## Binding phase state

```text
phase: FOUNDATION_ONLY
branch: new
sourceBranch: abdo
journeysAllowed: false
```

The machine-readable source for this state is:

```text
governance/refoundation/foundation-protection.policy.json
```

The routing and verification contract is:

```text
governance/refoundation/foundation-control-plane.json
```

## Preserve

The following capabilities are retained unless a tested, connected replacement is delivered in the same change:

- Node, pnpm, TypeScript, Nx, and workspace configuration;
- Expo application projects and central native configuration;
- EAS project identities, build profiles, and remote-build tooling;
- Firebase, Google Maps, notifications, Sentry, SecureStore, and native capability configuration;
- Docker runtime orchestration, PostgreSQL, MinIO, health checks, profiles, and local-only host bindings;
- OpenAPI composition, generation, validation, and generated-client tooling;
- local application start commands and PowerShell orchestration;
- GitHub Actions, registered guards, security checks, and evidence routing;
- useful packages, diagnostic tools, and build utilities that have a current executable purpose.

Preservation protects the capability, not a defective implementation. A defective foundation component must be corrected without destroying its working identity, external project binding, data, or replacement path.

## Allowed work

During this phase, changes may:

- correct broken or unsafe foundation behavior;
- centralize duplicated environment, build, runtime, or tool configuration;
- improve deterministic setup, verification, diagnostics, and failure reporting;
- remove confirmed foundation duplication after the canonical replacement is connected;
- strengthen governance, skills, guards, CI, secrets handling, and runtime safety;
- improve Expo, EAS, Firebase, Docker, OpenAPI, workspace, and command orchestration;
- remove temporary or obsolete foundation artifacts only when non-use and replacement are proven.

## Forbidden work

Until `journeysAllowed` is explicitly changed through a reviewed governance update, this phase must not:

- implement or modify a product journey;
- introduce new business behavior or user-facing workflow;
- add journey-specific backend routes, contracts, migrations, screens, or state machines;
- rewrite DSH, WLT, Identity, Workforce, Providers, or Platform Control domain logic;
- use cleanup as justification for deleting security, isolation, migration, contract, runtime, or negative tests;
- reset Docker volumes or destroy local data as part of ordinary verification;
- change EAS project IDs, Android package names, iOS bundle identifiers, Firebase projects, or signing identity without an explicit migration contract.

The executable foundation check rejects changes outside the permitted foundation paths while this phase is active.

## Change discipline

Every foundation change must be narrow and reversible:

```text
change
→ static verification
→ relevant configuration checks
→ runtime or remote-build proof when applicable
→ commit
```

Product cleanup and foundation rewrites must not be mixed in one commit. Deletion must follow proof of non-use and, when a capability remains required, proof of the connected replacement.

## Required authorities

Foundation work routes through the existing registered owner skills. No parallel skill or approval authority is created by this policy.

Required routing includes:

- workspace and ref resolution;
- universal task and risk routing;
- evidence routing;
- governance-contract integrity;
- CI workflow integrity;
- guard-command resolution;
- runtime configuration;
- Docker runtime evidence;
- security, secrets, and privacy review.

The exact skill IDs and guard IDs are declared in `foundation-control-plane.json` and validated against the canonical registries.

## Verification

The minimum local static entry point is:

```powershell
pnpm foundation:gate
```

The explicit full static entry point is:

```powershell
pnpm foundation:gate -- -Full
```

Runtime evidence remains separate and must use the existing Docker and mobile commands. A static pass cannot prove Docker services, devices, EAS remote builds, Firebase, external providers, or production behavior executed successfully.

## Exit criteria

The foundation phase may move to the second round only after all of the following are evidenced on one immutable commit:

1. the foundation protection and control-plane checks pass;
2. governance, skill, guard, workflow, and command registries are internally consistent;
3. Expo configuration and all four EAS project identities are preserved and verified;
4. Docker configuration is valid and the required runtime profile passes health and smoke checks;
5. OpenAPI generation and contract checks have a single executable route;
6. secrets and sensitive local configuration remain outside tracked source;
7. ordinary verification does not destroy Docker volumes or local data;
8. all five application surfaces retain a real start command;
9. no product journey change exists after the pinned `abdo` source commit;
10. the owner explicitly starts the second round and changes the governed phase state.

Until those conditions are evidenced, the permitted decision is scoped `PASS`, `READY_FOR_REVIEW`, `NEEDS_EVIDENCE`, or `FIX_REQUIRED`; this policy does not authorize `CLOSED_WITH_EVIDENCE` by itself.
