# U001 — authority-scope-inventory

## Objective

Freeze the **current BB Captain-only** full-stack impact map, truth ownership and explicit exclusions before implementation writes.

## Current diagnosis

This package was originally built for a different branch and old SHA. On current `BB`, both the implementation and the package framework changed materially: app-captain gained explicit readiness policy/tests, Identity/Workforce and DSH changed, mobile runtime/transport changed, finance gained Captain representative readback, `docs/architecture.drawio` became a non-empty ArchPulse artifact, and the package validator now requires different manifest disposability keys. The old baseline and old “missing Captain commission readback” finding are therefore stale.

The current pre-write diagnosis baseline is `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`. Concurrent movement was reconciled rather than overwritten: Identity migration compatibility at `de34ec33ff9ee52d0228a340453272d4e03ba7b1` is directly relevant to U002; the shared mobile LAN gateway repair at `086e48f8f8ed9deaa9d1525f379505af056df355` is relevant only as runtime/development transport; closure tooling at `629b86b9a3ca8fadc16158b6c9a078217ebe4af4` and the app-partner package rebaseline at `0916eb2500a0f6d83c47ed44124c02665f9cd0f9` are disjoint and remain outside Captain scope.

`docs/architecture.drawio` is useful only as a dependency-discovery aid. The actual authority chain remains current instruction → governance → Product Truth → exact pinned source/contracts/migrations/tests → runtime evidence.

The Captain boundary remains deliberately narrow. `app-captain` is primary. `control-panel`, `app-client` and `app-partner` enter only for the exact Captain journeys named in `COVERAGE.json`; `app-field` and generic analytics/dashboard/catalog/marketing/login remain excluded absent a newly proven shared effect.

## Root-cause rule

A current implementation that already satisfies Product Truth is not rewritten to make the plan look active. Execution must first reproduce or prove a mismatch. Any fix is made at the authoritative owner and only affected consumers/readbacks are migrated. No local surface truth, duplicate state machine, financial calculation, or parallel support route may be introduced as a shortcut.

## Closure rule

U001 closes only after the package passes the current strict validator and the targeted Captain inventory has no unclassified material dependency. The result records the exact candidate SHA and does not imply product/runtime closure.
