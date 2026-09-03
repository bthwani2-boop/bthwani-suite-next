# Target — Documentation and Runbooks

## 1. Mission

Refound `docs/` into the human guidance layer for developers and operators. It explains how to work with the current canonical system without becoming Product Truth, API authority, database authority, runtime state or release approval.

```text
DOCS = HOW TO DEVELOP / RUN / DIAGNOSE / OPERATE / RECOVER
DOCS != WHAT THE PRODUCT MEANS
DOCS != WHO OWNS BUSINESS TRUTH
DOCS != EXECUTABLE CONTRACT
```

## 2. Canonical information architecture

Converge toward a simple discoverable shape:

```text
docs/
├── README.md
├── getting-started/
│   ├── prerequisites.md
│   ├── clone-install.md
│   ├── local-environment.md
│   ├── run-mobile-apps.md
│   ├── run-control-panel.md
│   ├── run-services.md
│   └── first-change.md
├── development/
│   ├── workspace-commands.md
│   ├── mobile-development.md
│   ├── web-development.md
│   ├── backend-development.md
│   ├── database-development.md
│   ├── contracts-generation.md
│   ├── provider-sandboxes.md
│   └── debugging.md
├── operations/
│   ├── README.md
│   └── runbooks/
│       ├── identity/
│       ├── workforce/
│       ├── dsh/
│       ├── wlt/
│       ├── platform-control/
│       ├── mobile/
│       └── observability/
├── reference/
│   ├── ports.md
│   ├── commands.md
│   ├── environments.md
│   └── tooling.md
└── tooling/
    ├── github.md
    ├── graphify.md
    └── leanctx.md
```

Create only sections with real content; do not generate empty documentation bureaucracy.

## 3. Developer bootstrap acceptance

A competent engineer with repository access must be able to use `docs/README.md` plus linked canonical sources to:

```text
understand prerequisites
install the locked toolchain/dependencies
start required local infrastructure/services
run each mobile app and control panel
locate ports/config/environment inputs
generate contracts/clients correctly
run tests/typecheck/build/verification
make one representative change
find the canonical owner before placing new code
debug common local/runtime failures
understand where operational runbooks live
```

The bootstrap path must not require hidden machine state or tribal knowledge.

## 4. Runbook law

Runbooks are operational procedures owned by the service/domain that owns the affected runtime fact.

Each runbook should contain, when material:

```text
purpose/trigger
owner
preconditions/access level
safe diagnostics
decision points
recovery/containment
verification/readback
rollback/forward recovery
security/privacy handling
incident evidence
links to current executable authority
```

A runbook must not redefine a state machine, financial calculation, authorization rule or API contract.

Normalize filenames to lowercase kebab-case and real owner vocabulary. Historical names such as `order-truth-operations` must converge to the actual semantic owner when the content survives.

## 5. Generated/reference preference

Machine-discoverable or fast-changing reference material should be generated or derived where practical:

```text
ports from canonical runtime config where feasible
workspace commands from package scripts
API reference from canonical OpenAPI
service list from workspace/service definitions
environment keys from validated config schemas
```

Do not hand-copy large endpoint/table/operation inventories into docs.

## 6. Runtime/tooling guidance

Current operational/tooling documents may point to GitHub, EAS, Codespaces, Docker, Graphify, LeanCTX, Sentry or other tools, but tool names do not become architecture authority.

Financial simulator semantics belong with WLT/testing ownership; docs may explain how to invoke them.

## 7. Staleness and contradiction law

For any documented command/path/config/route:

```text
CURRENT EXECUTABLE SOURCE WINS
DOC DRIFT = FINDING
```

A doc may state stable examples, but must clearly distinguish examples from normative Product/System meaning. Obsolete instructions are corrected, merged or deleted rather than retained as history.

## 8. Documentation closure gate

```text
DOCS_README_ENTRYPOINT=PASS
NEW_DEVELOPER_BOOTSTRAP=PASS
GETTING_STARTED=PASS
DEVELOPMENT_GUIDANCE=PASS
OPERATIONS/RUNBOOK_TAXONOMY=PASS
REFERENCE/TOOLING_GUIDANCE=PASS
MIXED_FILENAME/TAXONOMY_DRIFT=0
DOCS_AS_PRODUCT/SYSTEM_AUTHORITY=0
DOCS_AS_API/DB/RUNTIME_TRUTH=0
STALE_COMMAND/PATH/ROUTE/CONFIG_GUIDANCE=0
DUPLICATE_RUNBOOK_OWNER=0
HIDDEN_LOCAL_PREREQUISITES=0
```
