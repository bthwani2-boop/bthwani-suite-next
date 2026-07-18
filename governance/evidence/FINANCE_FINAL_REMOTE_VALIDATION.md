# Finance Final Remote Validation

- Branch: `bassam`
- Source SHA: `7fb176c146ca6d79d2acb2d3b2206358a4accb24`
- Executed at: `2026-07-18T01:18:09Z`

## Finance source drift patcher

- Result: **PASS**

```text
Finance source drift closure complete; removed 0 tenant fallback(s).

```

## Finance contract patcher

- Result: **PASS**

```text
Finance contracts patched idempotently.

```

## Finance final drift patcher

- Result: **FAIL** (exit `1`)

```text
node:internal/modules/cjs/loader:1503
  throw err;
  ^

Error: Cannot find module '/home/runner/work/bthwani-suite-next/bthwani-suite-next/tools/scripts/close-finance-final-drifts.mjs'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1500:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at defaultResolveImplForCJSLoading (node:internal/modules/cjs/loader:1095:10)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1116:12)
    at Module._load (node:internal/modules/cjs/loader:1285:25)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v24.17.0

```

## Generate DSH OpenAPI client

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 openapi:generate:dsh /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm dlx openapi-typescript@7.13.0 services/dsh/contracts/dsh.openapi.yaml -o services/dsh/clients/generated/dsh-api.ts

Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +33
+++++++++++++++++++++++++++++++++
Progress: resolved 33, reused 30, downloaded 3, added 33, done
✨ openapi-typescript 7.13.0
 ✘  Can't resolve $ref at #/paths/~1dsh~1control-panel~1finance~1settlements~1from-delivered-orders/post/responses/400
 ✘  Can't resolve $ref at #/paths/~1dsh~1control-panel~1finance~1settlement-policies~1{partnerId}/put/responses/400
file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72cd6134-9bc/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/lib/redoc.mjs:74
      throw new Error(errorMessage);
            ^

Error: Can't resolve $ref at #/paths/~1dsh~1control-panel~1finance~1settlement-policies~1{partnerId}/put/responses/400
    at _processProblems (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72cd6134-9bc/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/lib/redoc.mjs:74:13)
    at validateAndBundle (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72cd6134-9bc/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/lib/redoc.mjs:116:3)
    at async openapiTS (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72cd6134-9bc/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/index.mjs:40:18)
    at async generateSchema (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72cd6134-9bc/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/bin/cli.js:143:5)
    at async main (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72cd6134-9bc/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/bin/cli.js:280:20)

Node.js v24.17.0
 ELIFECYCLE  Command failed with exit code 1.

```

## Generate WLT OpenAPI client

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 openapi:generate:wlt /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm dlx openapi-typescript@7.13.0 services/wlt/contracts/wlt.openapi.yaml -o services/wlt/clients/generated/wlt-api.ts

✨ openapi-typescript 7.13.0
🚀 services/wlt/contracts/wlt.openapi.yaml → services/wlt/clients/generated/wlt-api.ts [132.6ms]

```

## Go formatting

- Result: **PASS**

```text

```

## Git whitespace validation

- Result: **PASS**

```text

```

## WLT migration prefix uniqueness

- Result: **PASS**

```text

```

## WLT Go tests

- Result: **PASS**

```text
go: downloading github.com/lib/pq v1.12.3
?   	wlt-api/cmd/wlt-api	[no test files]
ok  	wlt-api/internal/cod	0.014s
ok  	wlt-api/internal/commercial	0.010s
ok  	wlt-api/internal/dshnotify	0.010s
?   	wlt-api/internal/dshoutbox	[no test files]
?   	wlt-api/internal/health	[no test files]
ok  	wlt-api/internal/http	0.018s
ok  	wlt-api/internal/ledger	0.009s
ok  	wlt-api/internal/payment	0.011s
ok  	wlt-api/internal/payout	0.016s
?   	wlt-api/internal/promotionfunding	[no test files]
ok  	wlt-api/internal/provider	0.011s
ok  	wlt-api/internal/reconciliation	0.008s
ok  	wlt-api/internal/reference	0.006s
ok  	wlt-api/internal/refund	0.007s
ok  	wlt-api/internal/settlement	0.005s
?   	wlt-api/internal/shared	[no test files]
?   	wlt-api/internal/wallet	[no test files]

```

## WLT Go build

- Result: **PASS**

```text

```

## DSH Go tests

- Result: **FAIL** (exit `1`)

```text
go: downloading github.com/google/uuid v1.6.0
go: downloading golang.org/x/image v0.44.0
go: downloading github.com/minio/minio-go/v7 v7.2.1
go: downloading github.com/cespare/xxhash/v2 v2.3.0
go: downloading github.com/dustin/go-humanize v1.0.1
go: downloading github.com/klauspost/compress v1.18.6
go: downloading github.com/klauspost/crc32 v1.3.0
go: downloading github.com/minio/crc64nvme v1.1.1
go: downloading github.com/minio/md5-simd v1.1.2
go: downloading github.com/zeebo/xxh3 v1.1.0
go: downloading go.yaml.in/yaml/v3 v3.0.4
go: downloading golang.org/x/net v0.53.0
go: downloading gopkg.in/ini.v1 v1.67.2
go: downloading golang.org/x/sys v0.44.0
go: downloading github.com/klauspost/cpuid/v2 v2.2.11
go: downloading golang.org/x/crypto v0.51.0
go: downloading github.com/rs/xid v1.6.0
go: downloading github.com/tinylib/msgp v1.6.1
go: downloading github.com/philhofer/fwd v1.2.0
go: downloading golang.org/x/text v0.40.0
# dsh-api/internal/orders
internal/orders/orders.go:334:6: AcceptOrder redeclared in this block
	internal/orders/lifecycle.go:11:6: other declaration of AcceptOrder
internal/orders/orders.go:339:6: RejectOrder redeclared in this block
	internal/orders/lifecycle.go:16:6: other declaration of RejectOrder
internal/orders/orders.go:383:6: enqueueOrderFinancialClosure redeclared in this block
	internal/orders/lifecycle.go:59:6: other declaration of enqueueOrderFinancialClosure
internal/orders/orders.go:398:6: CancelOrderByOperator redeclared in this block
	internal/orders/lifecycle.go:74:6: other declaration of CancelOrderByOperator
internal/orders/orders.go:406:6: MarkPreparing redeclared in this block
	internal/orders/lifecycle.go:82:6: other declaration of MarkPreparing
internal/orders/orders.go:411:6: MarkReadyForPickup redeclared in this block
	internal/orders/lifecycle.go:87:6: other declaration of MarkReadyForPickup
internal/orders/orders.go:416:6: TransitionDispatchOrder redeclared in this block
	internal/orders/lifecycle.go:92:6: other declaration of TransitionDispatchOrder
internal/orders/orders.go:420:6: transitionOrder redeclared in this block
	internal/orders/lifecycle.go:96:6: other declaration of transitionOrder
internal/orders/orders.go:454:6: transitionOrderTx redeclared in this block
	internal/orders/lifecycle.go:117:6: other declaration of transitionOrderTx
internal/orders/orders.go:504:6: listOrderItems redeclared in this block
	internal/orders/lifecycle.go:168:6: other declaration of listOrderItems
internal/orders/orders.go:504:6: too many errors
# dsh-api/internal/partnerfleet
internal/partnerfleet/courier_codes.go:10:2: "fmt" imported and not used
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	0.004s
ok  	dsh-api/internal/analytics	0.003s
ok  	dsh-api/internal/auth	0.008s
ok  	dsh-api/internal/cart	0.006s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.007s
ok  	dsh-api/internal/checkout	0.010s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.004s
?   	dsh-api/internal/coupons	[no test files]
FAIL	dsh-api/internal/dispatch [build failed]
ok  	dsh-api/internal/fieldcommissionoutbox	0.009s
ok  	dsh-api/internal/fieldreadiness	0.006s
ok  	dsh-api/internal/health	0.005s
ok  	dsh-api/internal/homediscovery	0.004s
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.007s
ok  	dsh-api/internal/media	0.006s
ok  	dsh-api/internal/notifications	0.007s
ok  	dsh-api/internal/operationaloutbox	0.005s
FAIL	dsh-api/internal/orders [build failed]
ok  	dsh-api/internal/partner	0.007s
FAIL	dsh-api/internal/partnerdelivery [build failed]
FAIL	dsh-api/internal/partnerfleet [build failed]
FAIL	dsh-api/internal/pickup [build failed]
ok  	dsh-api/internal/platformpolicies	0.004s
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.005s
ok  	dsh-api/internal/store	0.011s
ok  	dsh-api/internal/support	0.005s
ok  	dsh-api/internal/wlt	0.011s
ok  	dsh-api/internal/wltoutbox	0.004s
FAIL

```

## DSH Go build

- Result: **FAIL** (exit `1`)

```text
# dsh-api/internal/partnerfleet
internal/partnerfleet/courier_codes.go:10:2: "fmt" imported and not used
# dsh-api/internal/orders
internal/orders/orders.go:334:6: AcceptOrder redeclared in this block
	internal/orders/lifecycle.go:11:6: other declaration of AcceptOrder
internal/orders/orders.go:339:6: RejectOrder redeclared in this block
	internal/orders/lifecycle.go:16:6: other declaration of RejectOrder
internal/orders/orders.go:383:6: enqueueOrderFinancialClosure redeclared in this block
	internal/orders/lifecycle.go:59:6: other declaration of enqueueOrderFinancialClosure
internal/orders/orders.go:398:6: CancelOrderByOperator redeclared in this block
	internal/orders/lifecycle.go:74:6: other declaration of CancelOrderByOperator
internal/orders/orders.go:406:6: MarkPreparing redeclared in this block
	internal/orders/lifecycle.go:82:6: other declaration of MarkPreparing
internal/orders/orders.go:411:6: MarkReadyForPickup redeclared in this block
	internal/orders/lifecycle.go:87:6: other declaration of MarkReadyForPickup
internal/orders/orders.go:416:6: TransitionDispatchOrder redeclared in this block
	internal/orders/lifecycle.go:92:6: other declaration of TransitionDispatchOrder
internal/orders/orders.go:420:6: transitionOrder redeclared in this block
	internal/orders/lifecycle.go:96:6: other declaration of transitionOrder
internal/orders/orders.go:454:6: transitionOrderTx redeclared in this block
	internal/orders/lifecycle.go:117:6: other declaration of transitionOrderTx
internal/orders/orders.go:504:6: listOrderItems redeclared in this block
	internal/orders/lifecycle.go:168:6: other declaration of listOrderItems
internal/orders/orders.go:504:6: too many errors

```

## Contracts lint

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 contracts:lint /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/important-scripts/contracts-foundation.mjs

contracts-foundation: PASS

```

## WLT TypeScript

- Result: **PASS**

```text

> @bthwani/wlt@0.0.0 typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/wlt
> tsc --noEmit -p tsconfig.json


```

## Control-panel TypeScript

- Result: **PASS**

```text

> @bthwani/control-panel@ typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/apps/control-panel/runtime
> tsc --noEmit -p tsconfig.json


```

## WLT financial boundary

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 guard:wlt-financial-boundary /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/wlt-financial-boundary-gate.mjs

wlt-financial-boundary-gate: FAIL
- services/dsh/backend/internal/http/server.go DSH_SETTLEMENT_ROUTE_MISSING POST /dsh/control-panel/finance/settlements/from-delivered-orders
- services/dsh/backend/internal/http/server.go DSH_SETTLEMENT_ROUTE_MISSING PUT /dsh/control-panel/finance/settlement-policies/{partnerId}
 ELIFECYCLE  Command failed with exit code 1.

```

## Go routes extraction

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:go-routes-ci /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/go-routes-ci.mjs

GO_AST_ROUTES DSH: PASS routes=195
GO_AST_ROUTES WLT: PASS routes=69
GO_AST_ROUTES Identity: PASS routes=21
GO_AST_ROUTES Workforce: PASS routes=31
GO_AST_ROUTES: wrote transient diagnostics routes=316
GO_ROUTES_CI: PASS services=4 routes=316

```

## Broken imports

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:no-broken-imports /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/no-broken-imports.mjs

no-broken-imports: PASS

```

## Finance route-contract matrix

- Result: **FAIL** (exit `1`)

```text
missing router: POST /dsh/control-panel/finance/settlements/from-delivered-orders

```

## Finance Docker reset and smoke

- Result: **FAIL** (exit `1`)

```text

=== Docker engine availability ===
28.0.4
Docker engine availability: PASS

=== Reset WLT and financial simulator containers and volumes ===
[33;1mWARNING: Runtime default secret in use: BTHWANI_MINIO_ROOT_PASSWORD. Override it outside local-only development.[0m
[33;1mWARNING: Runtime default secret in use: BTHWANI_POSTGRES_PASSWORD. Override it outside local-only development.[0m
[33;1mWARNING: Runtime default secret in use: IDENTITY_LOCAL_BOOTSTRAP_PASSWORD. Override it outside local-only development.[0m
[31;1mruntime.ps1: [31;1mVariable reference is not valid. ':' was not followed by a valid variable name[0m
[31;1m[31;1mcharacter. Consider using ${} to delimit the name.[0m
[31;1mException: [0m/home/runner/work/bthwani-suite-next/bthwani-suite-next/tools/scripts/financial-simulator-local.ps1:35[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m  35 | [0m     [36;1mthrow "$Name failed with exit code $LASTEXITCODE"[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mReset WLT and financial simulator containers and volumes failed with[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mexit code 1[0m

```

## Final verdict

**FAIL — one or more finance closure gates failed; see the exact evidence above.**
