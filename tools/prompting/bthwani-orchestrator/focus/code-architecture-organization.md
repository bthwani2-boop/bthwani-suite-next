# Focus — Code Architecture, Organization, UI Implementation and Structural Quality

## 1. Purpose

Apply when the working cone includes implementation architecture, repository structure, modules/packages/files, shared code, UI/component implementation, accessibility, naming, dependency direction, duplication or cleanup.

This module does not own Product/System meaning. Product meaning, actors, journeys, responsibilities, information architecture and UX semantics are owned by `focus/governance-product-design.md`; this file owns their implementation structure.

## 2. Architecture follows meaning

Derive implementation structure in this order:

`Product Capability -> Canonical Owner -> Responsibility -> Domain Boundary -> Public Contract -> Data Ownership -> Dependency Direction -> Runtime Boundary -> Surface Composition -> Directory -> File -> Symbol`.

Do not reverse this by treating current folders/files as architecture authority.

A move/rename without semantic re-ownership, rewiring and cleanup is not an architectural fix.

## 3. Single responsibility and ownership

For every materially affected module/package/directory/file/component/helper prove:

`Necessary Purpose | Canonical Owner | Single Clear Responsibility | Real Consumer | Correct Layer | Correct Dependency Direction | Proven Value | Correct Placement | Clear Name`.

Ownerless or multiply-owned implementation is a finding when it can produce ambiguity, duplicated decisions, wrong dependencies or future mutation in the wrong place.

## 4. Semantic duplication

Inspect beyond textual clones:

`business/decision-rule duplication | authorization duplication | state-mapping duplication | DTO/contract mapping duplication | validation duplication | config/routing duplication | duplicated writer logic | duplicate UI state authority | textual duplication`.

Prefer removing duplicated authority/decision logic at the canonical owner before reducing low-risk textual repetition.

## 5. Shared/common/utils/helpers

Names do not create shared authority.

A shared abstraction is justified only when it represents a genuinely shared stable concept with a clear owner and multiple real consumers without leaking domain authority.

A generic directory with unrelated responsibilities or no clear owner is a structural finding. Split/rehome/inline/merge/delete according to proven semantics; do not preserve a junk drawer because many imports point to it.

## 6. Wrappers, adapters and indirection

Each wrapper/adapter/facade/helper must own unique material value such as:

`protocol translation | policy | security boundary | lifecycle/state | compatibility with explicit expiry | orchestration | testable transformation | runtime boundary`.

If it is pass-through indirection with no unique responsibility, classify it for inline/merge/delete after consumer proof.

Adding a wrapper around wrong ownership is not a fix.

## 7. Dependency direction

Dependencies should flow toward stable canonical owners/boundaries. Inspect materially affected:

- circular dependencies;
- lower-level modules importing surfaces/apps;
- domain logic depending on transport/UI;
- direct persistence/provider access bypassing canonical owner;
- duplicated cross-surface business logic;
- public APIs leaking internal models;
- convenience re-export chains that hide ownership;
- package boundaries that exist only historically.

Fix dependency direction at the highest correct boundary; do not add inversion layers without proven value.

## 8. Files and directories

Audit structure at the necessary level:

`symbol -> file -> file family -> directory -> package/module -> service/surface -> domain`.

For material directories prove:

`owner | responsibility | allowed contents | public boundary | incoming/outgoing dependencies | real consumers | generated contents | runtime relation | reason to exist`.

Directories named `old`, `legacy`, `backup`, `archive`, `temp`, `misc`, `stuff`, `common`, `shared`, `utils`, `helpers` are not auto-delete. They are high-suspicion when they have mixed ownership, unclear consumers or superseded content.

Git is the default repository history; do not keep active backup copies without a live requirement.

## 9. Naming and discoverability

A competent engineer/agent should be able to identify the canonical owner, contract, model, config, command and runtime path without guesswork.

Misleading stale names/aliases/duplicate commands/multiple plausible paths are defects when they can redirect future writes to the wrong authority.

After rename/move, repair references and remove obsolete aliases unless a bounded compatibility requirement proves otherwise.

## 10. UI implementation quality

When UI is material, verify implementation against proven Product/UX semantics:

- component ownership and composition;
- state ownership and server/readback binding;
- loading/empty/error/recovery states;
- accessibility and keyboard/screen-reader semantics where applicable;
- responsive and RTL/localization behavior where required;
- consistent design-system use when it has real project authority;
- no local business truth embedded solely to make a screen work;
- authorization enforced server-side, not only via hidden UI.

Visual polish does not substitute for correct journey/state/authority behavior.

## 11. Generated and derived code

Generated bindings/artifacts are normally derived. Apply `02` Generated-Output Law: fix the authoritative source/generator, regenerate, then verify consumers.

Do not create hand-maintained forks of generated truth for local convenience.

## 12. Dependency/package hygiene

Within the affected cone inspect:

`unused dependencies | duplicate package responsibility | obsolete compatibility package | stale workspace declaration | duplicate build script | dead command | unnecessary wrapper package | obsolete generated package`.

Remove only after consumer/build/runtime proof, but once proven obsolete cleanup is mandatory under `03`.

## 13. Test structure

Tests should sit near the authority/behavior they falsify and should not encode superseded implementation structure as product semantics.

After structural/semantic change classify stale mocks, fixtures, snapshots, helper harnesses and tests for deleted behavior. Preserve valid falsification strength; remove obsolete test infrastructure after replacement proof.

## 14. Structural finishing

Before closure, inspect every materially affected remaining structure for:

`ownerless artifact | misplaced file | duplicated authority | unjustified directory | pass-through wrapper | dead alias | stale import/export | obsolete dependency | generated fork | legacy residue | unfinished move/split/merge`.

Known material structural residue tied to the root blocks `CLOSED` under `04`.
