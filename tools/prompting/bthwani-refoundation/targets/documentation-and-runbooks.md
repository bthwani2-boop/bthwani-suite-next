# Target — Documentation and Runbooks

TEMPORARY_TARGET_SPECIALIZATION: YES
GENERAL_EXECUTION_AUTHORITY: NONE

## 1. Mission

Refound `docs/**` into a human developer/operations knowledge system that is navigable from one entrypoint and cannot become parallel Product, contract, database or runtime authority.

## 2. Target information architecture

```text
docs/
├── README.md
├── development/
│   ├── getting-started.md
│   ├── runtime.md
│   ├── mobile.md
│   ├── providers-and-sandboxes.md
│   ├── eas.md
│   ├── sentry.md
│   ├── github-evidence.md
│   └── leanctx.md
├── runbooks/
│   ├── README.md
│   └── <focused operational runbooks>
└── reference/
    └── external-systems/
        ├── README.md
        └── <topic reference files>
```

## 3. Developer bootstrap acceptance

A new developer must be able to identify from `docs/README.md`:

- which Governance files define platform meaning;
- exact current toolchain constraints;
- install command;
- primary app/control commands;
- affected/full verification entrypoints;
- runtime modes and current declared local endpoints;
- mobile/device workflow;
- where provider/sandbox guidance lives;
- where operational runbooks live;
- how to use external references without treating them as authority.

## 4. Runtime/command law

Docs may summarize current commands/ports only after verifying them against live executable source. They must identify scripts/configuration as current command/runtime authority.

```text
STALE_COMMAND != COMPATIBILITY_GUIDANCE
STALE_PATH != HISTORICAL_VALUE
```

Delete or correct stale instructions rather than retaining them "just in case."

## 5. Runbook law

Runbooks own diagnosis/containment/recovery guidance only. They must not bypass domain transitions with direct state edits, fabricate unknown financial/provider outcomes, copy secrets/PII into evidence or redefine Product truth.

## 6. External reference law

External reference material belongs under `docs/reference/**`, is non-authoritative and is loaded only when a material question benefits from it.

```text
REFERENCE_SELECTION != ADOPTION_SELECTION
DONOR_VALUE != DONOR_AUTHORITY
```

Named AI/model routing and transient campaign research mechanics do not belong in durable docs.

## 7. Closure gate

```text
DOCS_ENTRYPOINT=PASS
NEW_DEVELOPER_BOOTSTRAP=PASS
DEVELOPMENT_GUIDANCE=PASS
RUNBOOK_ROUTING=PASS
EXTERNAL_REFERENCE_BOUNDARY=PASS
DOCS_PARALLEL_PRODUCT/CONTRACT/DATA_AUTHORITY=0
STALE_PRODUCT_TRUTH_JSON_REFERENCES=0
STALE_COMMAND/PATH/BRANCH_GUIDANCE=0
LOOSE_PROMPTING_DEVELOPMENT/REFERENCE_DOCS=0
```
