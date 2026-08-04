# Diagnose/Implementing Package Framework

This directory contains the permanent, non-authoritative framework for creating task-specific diagnosis and implementation packages.

## Purpose

A task package under `tools/diagnose-implementing/<task-name>/` is a temporary derived-support artifact used to:

1. pin the exact remote branch and commit being diagnosed;
2. map the complete proven scope and its exclusions;
3. record evidence-backed findings and root causes;
4. decompose complex work into dependency-ordered phases and atomic work items;
5. bind each work item to exact acceptance criteria and verification;
6. support safe hand-off between agents without relying on memory;
7. prove closure or report remaining blockers without unsupported completeness claims.

The package is not product truth, runtime code, a contract authority, a database authority, an approval record, or a replacement for canonical governance. It must defer to `AGENTS.md`, `governance/authority/authority-precedence.json`, the active canonical policies, machine-readable contracts, and the live code and remote state at the pinned commit.

## Permanent versus disposable content

Permanent framework content:

- `README.md`
- `_template/`
- `new-package.mjs`
- `validate-package.mjs`

Disposable task content:

- every sibling directory created for a concrete task, for example `dsh-wlt-contract-convergence/`

A completed task package must be safe to delete in full. Git history remains the historical record; no live source, build, runtime, migration, test, CI, release, governance, or operational process may depend on the task package remaining present.

## Mandatory lifecycle

```text
PIN
→ CLASSIFY AUTHORITY
→ DEFINE SCOPE
→ INVENTORY
→ COLLECT EVIDENCE
→ REGISTER FINDINGS
→ MAP ROOT CAUSES AND TRUTH OWNERS
→ DESIGN TARGET STATE
→ PHASE AND SLICE
→ AUTHOR ATOMIC WORK ITEMS
→ VALIDATE PACKAGE
→ OBTAIN EXECUTION AUTHORIZATION WHEN REQUIRED
→ EXECUTE ONE OPEN WORK ITEM AT A TIME
→ VERIFY AFTER THE LAST RELEVANT WRITE
→ RE-PIN
→ CLOSE WITH EVIDENCE OR REPORT BLOCKER
→ PROVE DISPOSABILITY
→ DELETE THE TASK PACKAGE
```

Creating a package does not itself authorize code changes. The manifest must record the current execution authorization explicitly.

## Creation

From the repository root:

```powershell
node tools/diagnose-implementing/new-package.mjs --name <task-name> --branch <branch> --sha <40-character-sha>
```

Names must use lowercase letters, digits, and hyphens only. The generator refuses `_template`, path separators, hidden names, and an existing destination.

## Validation

During diagnosis and planning:

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name>
```

Before claiming the plan is ready:

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name> --strict
```

Before deleting a closed package:

```powershell
node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/<task-name> --strict --disposal
```

`--disposal` scans the repository outside the package and fails when another tracked text file references the package path. This prevents deletion while a live dependency remains.

## Required package structure

The generator creates this baseline:

```text
<task-name>/
├─ 00-MANIFEST.json
├─ 01-DIAGNOSIS-REPORT.md
├─ 02-FINDINGS-REGISTER.json
├─ 03-EXECUTION-PLAN.md
├─ 04-WORK-ITEMS.json
├─ 05-VERIFICATION-MATRIX.json
├─ 06-CLOSURE-AND-DISPOSAL.md
├─ evidence/
│  └─ README.md
├─ phases/
│  └─ PHASE-00.md
└─ tasks/
   └─ TASK-0001.json
```

Expand the structure only when the task proves a need. Do not add files merely to make the package look large.

## Anti-shallow rules

A package is invalid when it contains polished prose without executable detail. Apply all rules below:

1. Every material claim must have an evidence identifier.
2. Source-code evidence must include repository, pinned SHA, path, and exact line or symbol range.
3. Every finding must state the observable problem, root cause, correct truth owner, risk, affected consumers, and why the proposed correction fixes the cause rather than the symptom.
4. Every in-scope file or component must be classified as affected, not affected with reason, obsolete candidate, duplicate candidate, migration required, external, or unproven.
5. Every finding must map to at least one work item unless it is explicitly external or rejected with reason.
6. Every work item must map to exact paths, exact intended changes, forbidden changes, dependencies, acceptance criteria, verification identifiers, rollback, and commit boundary.
7. Every verification entry must state what claim it proves and what it does not prove.
8. A passing build alone may not prove runtime, security, finance, isolation, migration, visual, release, or production behavior.
9. Complex work must be divided by operational dependency into phases, then into vertical slices. Do not group all backend work before all frontend work when one behavior crosses layers.
10. Only one implementation work item may be `IN_PROGRESS` at a time unless explicit evidence proves safe independence.
11. Terms such as `fix`, `improve`, `clean`, `complete`, or `verify everything` are prohibited as standalone instructions. They must be expanded into concrete actions and measurable outcomes.
12. `TODO`, `TBD`, `unknown`, empty required arrays, and unresolved template markers are allowed only while the package status is `DIAGNOSIS_IN_PROGRESS`; strict validation rejects them.
13. Uncertainty must be recorded as `UNPROVEN` or `NEEDS_EVIDENCE`, never hidden behind confident wording.
14. The package must record exclusions and the evidence supporting each exclusion. Silence is not an exclusion.
15. Counts in the manifest must match the actual registers before readiness or closure is claimed.

## Evidence quality

Prefer evidence in this order:

1. current remote file or contract at the pinned SHA;
2. direct dependency or reference search at the pinned SHA;
3. targeted static check;
4. targeted unit, integration, contract, migration, security, negative, runtime, or cross-surface result;
5. current external provider or infrastructure evidence when required;
6. historical evidence only for explaining origin, never as current implementation truth.

Do not commit secrets, tokens, credentials, private keys, production data, personal data, raw database dumps, or sensitive screenshots into a task package. Record a sanitized reference and verification method instead.

## Complexity and phase splitting

Split a task into phases when any of these applies:

- multiple truth owners or services are involved;
- data migration or compatibility sequencing is required;
- authentication, authorization, finance, isolation, CI, release, or production is affected;
- more than one surface consumes the behavior;
- deletion depends on prior consumer migration;
- rollback differs between parts of the change;
- the full task cannot be verified safely in one logical commit.

Every phase must define inputs, outputs, dependencies, owned findings, work items, acceptance criteria, verification, rollback boundary, and a zero gate. The next phase cannot open while the current phase has an internal fixable gap.

## Deletion and migration safety

No file may be deleted merely because it looks old. A deletion record must prove:

- all imports, references, scripts, workflows, documentation links, generated outputs, runtime paths, and consumers were searched;
- the authoritative replacement exists and consumers have migrated, or no replacement is required;
- data and contract compatibility impact was assessed;
- targeted checks passed after deletion;
- rollback or recovery is possible through Git history or an explicit migration reversal;
- no live path depends on a file inside the task package.

## Disposable-package contract

A task package may be deleted immediately after successful closure only when all conditions are true:

- durable code, tests, contracts, migrations, documentation, and governance changes are stored in their canonical repository locations, not only in the package;
- no runtime import, package export, workspace dependency, script, workflow, guard, required check, migration, generated client, deployment step, or operational runbook depends on the package;
- required approvals and external evidence are stored in their authoritative systems or linked by immutable references;
- the final implementation commit and verification commit/SHA are recorded;
- the closure report contains no unique instruction needed to operate or maintain the system;
- repository-wide reference scanning finds no external reference to the package path;
- the package contains no uncommitted evidence that would be lost;
- deleting the package is performed in a dedicated cleanup commit and targeted verification is rerun when its removal could affect repository tooling.

If any condition fails, the package is not disposable and the missing durable information must first be moved to its canonical owner.

## Decision vocabulary

Use canonical repository decisions only, including:

- `PASS`
- `FIX_REQUIRED`
- `BLOCKED_EXTERNAL`
- `NEEDS_EVIDENCE`
- `READY_FOR_REVIEW`
- `PROTOCOL_VIOLATION`
- `CLOSED_WITH_EVIDENCE`

`CLOSED_WITH_EVIDENCE` is valid only for all applicable evidence scopes on the same immutable commit, with no open fail, blocked, or pending item and all required independent approvals.

## Prohibited dependencies

Never:

- import code from a task package;
- add a task package to a workspace, package export, compiler input, runtime image, migration chain, application bundle, generated-code source, CI required path, or release artifact;
- make a guard or production workflow require a specific task package;
- store the only copy of a durable architecture decision inside a disposable package;
- treat the framework or a generated package as authority over canonical governance or live source truth;
- archive deleted production files inside the package when Git history already preserves them.
