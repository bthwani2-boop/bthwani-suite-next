# JRN-033 Remote Diagnostic Result

- source_sha: `a76ab06dc0f86d33c68b2f9f3cdbba89007ba10e`
- workflow_run: `29923668737`
- workflow_attempt: `1`
- generated_at: `2026-07-22T13:56:14Z`

### wlt_wallet
```text
=== RUN   TestNormalizeRepresentativeActorType
--- PASS: TestNormalizeRepresentativeActorType (0.00s)
=== RUN   TestHandleGetWalletRejectsUnsupportedActorBeforeDatabaseAccess
    handler_test.go:34: expected unsupported actor error, got {"code":"TENANT_REQUIRED","message":"X-Tenant-ID is required for representative finance reads"}
--- FAIL: TestHandleGetWalletRejectsUnsupportedActorBeforeDatabaseAccess (0.00s)
=== RUN   TestHandleGetWalletRejectsOversizedActorIDBeforeDatabaseAccess
    handler_test.go:50: expected invalid actor id error, got {"code":"TENANT_REQUIRED","message":"X-Tenant-ID is required for representative finance reads"}
--- FAIL: TestHandleGetWalletRejectsOversizedActorIDBeforeDatabaseAccess (0.00s)
FAIL
FAIL	wlt-api/internal/wallet	0.004s
FAIL
```
exit_code: `1`

### dsh_wlt
```text
# dsh-api/internal/wlt [dsh-api/internal/wlt.test]
internal/wlt/mutation_headers_test.go:102:89: not enough arguments in call to client.FinanceWriteCodRecord
	have (context.Context, string, string, string)
	want (context.Context, string, string, []byte, string)
FAIL	dsh-api/internal/wlt [build failed]
FAIL
```
exit_code: `1`

### own_wallet
```text
=== RUN   TestRepresentativeOwnWalletRoutesResolveAuthenticatedActor
=== RUN   TestRepresentativeOwnWalletRoutesResolveAuthenticatedActor/client
--- FAIL: TestRepresentativeOwnWalletRoutesResolveAuthenticatedActor (0.00s)
    --- FAIL: TestRepresentativeOwnWalletRoutesResolveAuthenticatedActor/client (0.00s)
panic: pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11) conflicts with pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:241):
	GET /dsh/operator/analytics/support matches the same requests as GET /dsh/operator/analytics/support [recovered, repanicked]

goroutine 9 [running]:
testing.tRunner.func1.2({0xb54740, 0x3879ef7819d0})
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1974 +0x232
testing.tRunner.func1()
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1977 +0x349
panic({0xb54740?, 0x3879ef7819d0?})
	/opt/hostedtoolcache/go/1.26.4/x64/src/runtime/panic.go:860 +0x13a
net/http.(*ServeMux).register(...)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2882
net/http.(*ServeMux).HandleFunc(0xc4e06c?, {0xc38d41?, 0xcc2ee0?}, 0x3879ef781900?)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2856 +0x5e
dsh-api/internal/http.registerJRN032AnalyticsRoutes(0x3879ef5aa180, 0x3879ef4a1a80)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11 +0x15c
dsh-api/internal/http.registerDeliveryProofRoutes(0x3879ef5aa180, 0x3879ef4a1a80)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/delivery_proof_routes.go:17 +0x2ab
dsh-api/internal/http.registerUnifiedCatalogRoutes(0x3879ef5aa180, 0x3879ef4a1a80)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/catalog_unified_routes.go:74 +0x25
dsh-api/internal/http.NewRouter(0x0, 0x3879ef46c270, 0x3879ef661dd0, 0x0)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:307 +0x52db
dsh-api/internal/http.representativeFinanceRouter(0x3879ef5c0b48, {0xc16890, 0x6}, {0xc17e07, 0x8}, 0x3879ef5cccd0)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:36 +0x2be
dsh-api/internal/http.TestRepresentativeOwnWalletRoutesResolveAuthenticatedActor.func1(0x3879ef5c0b48)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:60 +0x14d
testing.tRunner(0x3879ef5c0b48, 0x3879ef4dd8c0)
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2036 +0xea
created by testing.(*T).Run in goroutine 8
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2101 +0x4c5
FAIL	dsh-api/internal/http	0.009s
FAIL
```
exit_code: `1`

### own_ledger
```text
=== RUN   TestRepresentativeOwnLedgerRoutesOverrideActorQuery
--- FAIL: TestRepresentativeOwnLedgerRoutesOverrideActorQuery (0.00s)
panic: pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11) conflicts with pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:241):
	GET /dsh/operator/analytics/support matches the same requests as GET /dsh/operator/analytics/support [recovered, repanicked]

goroutine 8 [running]:
testing.tRunner.func1.2({0xb54740, 0x20efc1e359c0})
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1974 +0x232
testing.tRunner.func1()
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1977 +0x349
panic({0xb54740?, 0x20efc1e359c0?})
	/opt/hostedtoolcache/go/1.26.4/x64/src/runtime/panic.go:860 +0x13a
net/http.(*ServeMux).register(...)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2882
net/http.(*ServeMux).HandleFunc(0xc4e06c?, {0xc38d41?, 0xcc2ee0?}, 0x20efc1e358f0?)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2856 +0x5e
dsh-api/internal/http.registerJRN032AnalyticsRoutes(0x20efc1c5c180, 0x20efc1bd3a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11 +0x15c
dsh-api/internal/http.registerDeliveryProofRoutes(0x20efc1c5c180, 0x20efc1bd3a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/delivery_proof_routes.go:17 +0x2ab
dsh-api/internal/http.registerUnifiedCatalogRoutes(0x20efc1c5c180, 0x20efc1bd3a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/catalog_unified_routes.go:74 +0x25
dsh-api/internal/http.NewRouter(0x0, 0x20efc1b9e240, 0x20efc1d1fda0, 0x0)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:307 +0x52db
dsh-api/internal/http.representativeFinanceRouter(0x20efc1c72908, {0xc170ed, 0x7}, {0xc18935, 0x9}, 0x20efc1dc4f80)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:36 +0x2be
dsh-api/internal/http.TestRepresentativeOwnLedgerRoutesOverrideActorQuery(0x20efc1c72908)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:91 +0x9e
testing.tRunner(0x20efc1c72908, 0xcbaa90)
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2036 +0xea
created by testing.(*T).Run in goroutine 1
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2101 +0x4c5
FAIL	dsh-api/internal/http	0.009s
FAIL
```
exit_code: `1`

### operator_wallet
```text
=== RUN   TestControlPanelRepresentativeWalletValidatesTypeAndUsesPermissionFallback
--- FAIL: TestControlPanelRepresentativeWalletValidatesTypeAndUsesPermissionFallback (0.00s)
panic: pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11) conflicts with pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:241):
	GET /dsh/operator/analytics/support matches the same requests as GET /dsh/operator/analytics/support [recovered, repanicked]

goroutine 8 [running]:
testing.tRunner.func1.2({0xb54740, 0x365f639a99d0})
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1974 +0x232
testing.tRunner.func1()
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1977 +0x349
panic({0xb54740?, 0x365f639a99d0?})
	/opt/hostedtoolcache/go/1.26.4/x64/src/runtime/panic.go:860 +0x13a
net/http.(*ServeMux).register(...)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2882
net/http.(*ServeMux).HandleFunc(0xc4e06c?, {0xc38d41?, 0xcc2ee0?}, 0x365f639a9900?)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2856 +0x5e
dsh-api/internal/http.registerJRN032AnalyticsRoutes(0x365f637d0180, 0x365f63747a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11 +0x15c
dsh-api/internal/http.registerDeliveryProofRoutes(0x365f637d0180, 0x365f63747a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/delivery_proof_routes.go:17 +0x2ab
dsh-api/internal/http.registerUnifiedCatalogRoutes(0x365f637d0180, 0x365f63747a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/catalog_unified_routes.go:74 +0x25
dsh-api/internal/http.NewRouter(0x0, 0x365f63712240, 0x365f638ffda0, 0x0)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:307 +0x52db
dsh-api/internal/http.representativeFinanceRouter(0x365f637e6908, {0xc17b5f, 0x8}, {0xc1961b, 0xa}, 0x365f63938f90)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:36 +0x2be
dsh-api/internal/http.TestControlPanelRepresentativeWalletValidatesTypeAndUsesPermissionFallback(0x365f637e6908)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:121 +0x9e
testing.tRunner(0x365f637e6908, 0xcba8f0)
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2036 +0xea
created by testing.(*T).Run in goroutine 1
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2101 +0x4c5
FAIL	dsh-api/internal/http	0.009s
FAIL
```
exit_code: `1`

### operator_ledger
```text
=== RUN   TestControlPanelRepresentativeLedgerPinsActorAndNoStore
--- FAIL: TestControlPanelRepresentativeLedgerPinsActorAndNoStore (0.00s)
panic: pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11) conflicts with pattern "GET /dsh/operator/analytics/support" (registered at /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:241):
	GET /dsh/operator/analytics/support matches the same requests as GET /dsh/operator/analytics/support [recovered, repanicked]

goroutine 8 [running]:
testing.tRunner.func1.2({0xb54740, 0x179271f79e0})
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1974 +0x232
testing.tRunner.func1()
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:1977 +0x349
panic({0xb54740?, 0x179271f79e0?})
	/opt/hostedtoolcache/go/1.26.4/x64/src/runtime/panic.go:860 +0x13a
net/http.(*ServeMux).register(...)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2882
net/http.(*ServeMux).HandleFunc(0xc4e06c?, {0xc38d41?, 0xcc2ee0?}, 0x179271f7910?)
	/opt/hostedtoolcache/go/1.26.4/x64/src/net/http/server.go:2856 +0x5e
dsh-api/internal/http.registerJRN032AnalyticsRoutes(0x179270a0180, 0x17926f97a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/jrn032_routes.go:11 +0x15c
dsh-api/internal/http.registerDeliveryProofRoutes(0x179270a0180, 0x17926f97a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/delivery_proof_routes.go:17 +0x2ab
dsh-api/internal/http.registerUnifiedCatalogRoutes(0x179270a0180, 0x17926f97a40)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/catalog_unified_routes.go:74 +0x25
dsh-api/internal/http.NewRouter(0x0, 0x17926f62258, 0x17927157da0, 0x0)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/server.go:307 +0x52db
dsh-api/internal/http.representativeFinanceRouter(0x179270b6908, {0xc17b5f, 0x8}, {0xc1961b, 0xa}, 0x17926f621e0)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:36 +0x2be
dsh-api/internal/http.TestControlPanelRepresentativeLedgerPinsActorAndNoStore(0x179270b6908)
	/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/http/representative_finance_routes_test.go:149 +0xcc
testing.tRunner(0x179270b6908, 0xcba8e8)
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2036 +0xea
created by testing.(*T).Run in goroutine 1
	/opt/hostedtoolcache/go/1.26.4/x64/src/testing/testing.go:2101 +0x4c5
FAIL	dsh-api/internal/http	0.009s
FAIL
```
exit_code: `1`

### dsh_build
```text
```
exit_code: `0`

### static_guard
```text
✔ JRN-033 product truth keeps WLT ownership and independent acceptance pending (1.940368ms)
✔ JRN-033 WLT accepts only supported representative wallet actors (0.354264ms)
✖ JRN-033 self-service routes derive actor identity and operator routes pin actor scope (0.725089ms)
✔ JRN-033 shared actor wallet brain uses canonical DSH routes only (0.34147ms)
✔ JRN-033 client partner captain and field surfaces bind wallet truth (0.466073ms)
✔ JRN-033 control panel lookup loads a permission-scoped wallet and matching ledger (0.276157ms)
✔ JRN-033 focused contract declares every wallet and ledger operation (0.252624ms)
✔ JRN-033 runtime evidence aligns Identity subjects with WLT wallets and negative checks (0.414978ms)
✔ JRN-033 contains no representative balance mutation route in the new boundary (0.359935ms)
ℹ tests 9
ℹ suites 0
ℹ pass 8
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 71.110671

✖ failing tests:

test at services/dsh/tests/jrn-033-representative-wallets-governance.test.mjs:53:1
✖ JRN-033 self-service routes derive actor identity and operator routes pin actor scope (0.725089ms)
  AssertionError [ERR_ASSERTION]: representative finance routes is missing "actorId":   {actor.ID}
      at assertIncludesAll (file:///home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/tests/jrn-033-representative-wallets-governance.test.mjs:16:12)
      at TestContext.<anonymous> (file:///home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/tests/jrn-033-representative-wallets-governance.test.mjs:57:3)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1306:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:897:18)
      at Test.postRun (node:internal/test_runner/test:1447:19)
      at Test.run (node:internal/test_runner/test:1372:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:897:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```
exit_code: `1`

### focused_typescript
```text
error TS2688: Cannot find type definition file for 'react-dom'.
  The file is in the program because:
    Entry point of type library 'react-dom' specified in compilerOptions
```
exit_code: `2`

### focused_openapi
```text
✨ openapi-typescript 7.13.0
🚀 contracts/jrn-033-representative-finance.openapi.yaml → /tmp/jrn033/jrn-033-api.ts [59.4ms]
```
exit_code: `0`

### product_truth
```text
```
exit_code: `0`

### whitespace
```text
```
exit_code: `0`

