# Finance Final Remote Validation

- Branch: `bassam`
- Source SHA: `9a46aff0f6901feddf8ffc243356f8def0978d7e`
- Executed at: `2026-07-18T01:26:46Z`

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

- Result: **PASS**

```text
Final finance route, contract and runtime drifts closed.

```

## Generate DSH OpenAPI client

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 openapi:generate:dsh /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm dlx openapi-typescript@7.13.0 services/dsh/contracts/dsh.openapi.yaml -o services/dsh/clients/generated/dsh-api.ts

Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +33
+++++++++++++++++++++++++++++++++
Progress: resolved 33, reused 30, downloaded 3, added 33, done
✨ openapi-typescript 7.13.0
🚀 services/dsh/contracts/dsh.openapi.yaml → services/dsh/clients/generated/dsh-api.ts [408.5ms]

```

## Generate WLT OpenAPI client

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 openapi:generate:wlt /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm dlx openapi-typescript@7.13.0 services/wlt/contracts/wlt.openapi.yaml -o services/wlt/clients/generated/wlt-api.ts

✨ openapi-typescript 7.13.0
🚀 services/wlt/contracts/wlt.openapi.yaml → services/wlt/clients/generated/wlt-api.ts [135.5ms]

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
ok  	wlt-api/internal/cod	0.011s
ok  	wlt-api/internal/commercial	0.004s
ok  	wlt-api/internal/dshnotify	0.005s
?   	wlt-api/internal/dshoutbox	[no test files]
?   	wlt-api/internal/health	[no test files]
ok  	wlt-api/internal/http	0.013s
ok  	wlt-api/internal/ledger	0.008s
ok  	wlt-api/internal/payment	0.014s
ok  	wlt-api/internal/payout	0.011s
?   	wlt-api/internal/promotionfunding	[no test files]
ok  	wlt-api/internal/provider	0.007s
ok  	wlt-api/internal/reconciliation	0.008s
ok  	wlt-api/internal/reference	0.009s
ok  	wlt-api/internal/refund	0.008s
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
go: downloading github.com/klauspost/cpuid/v2 v2.2.11
go: downloading golang.org/x/sys v0.44.0
go: downloading golang.org/x/crypto v0.51.0
go: downloading github.com/rs/xid v1.6.0
go: downloading github.com/tinylib/msgp v1.6.1
go: downloading github.com/philhofer/fwd v1.2.0
go: downloading golang.org/x/text v0.40.0
# dsh-api/internal/http
internal/http/catalog_unified_routes.go:110:64: s.handleListCatalogMasterProducts undefined (type *protectedStoreServer has no field or method handleListCatalogMasterProducts)
internal/http/catalog_unified_routes.go:111:65: s.handleCreateCatalogMasterProduct undefined (type *protectedStoreServer has no field or method handleCreateCatalogMasterProduct)
internal/http/catalog_unified_routes.go:113:66: s.handleListCatalogProposals undefined (type *protectedStoreServer has no field or method handleListCatalogProposals)
internal/http/catalog_unified_routes.go:116:66: s.handleListCatalogPlatformPolicies undefined (type *protectedStoreServer has no field or method handleListCatalogPlatformPolicies)
internal/http/catalog_unified_routes.go:119:68: s.handleGetOperatorStoreAssortment undefined (type *protectedStoreServer has no field or method handleGetOperatorStoreAssortment)
internal/http/partner_fleet.go:75:35: undefined: partnerfleet.ListStoreConnections
internal/http/partner_fleet.go:129:35: undefined: partnerfleet.ListCaptainMemberships
internal/http/server.go:150:87: protected.handleCaptainCollectCod undefined (type *protectedStoreServer has no field or method handleCaptainCollectCod)
internal/http/server.go:151:85: protected.handleCaptainRemitCod undefined (type *protectedStoreServer has no field or method handleCaptainRemitCod)
internal/http/server.go:152:67: protected.handleCaptainFinanceCommissions undefined (type *protectedStoreServer has no field or method handleCaptainFinanceCommissions)
internal/http/server.go:152:67: too many errors
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	0.004s
ok  	dsh-api/internal/analytics	0.004s
ok  	dsh-api/internal/auth	0.009s
ok  	dsh-api/internal/cart	0.004s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.007s
ok  	dsh-api/internal/checkout	0.004s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.005s
?   	dsh-api/internal/coupons	[no test files]
ok  	dsh-api/internal/dispatch	0.011s
ok  	dsh-api/internal/fieldcommissionoutbox	0.011s
ok  	dsh-api/internal/fieldreadiness	0.006s
ok  	dsh-api/internal/health	0.012s
ok  	dsh-api/internal/homediscovery	0.004s
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.008s
ok  	dsh-api/internal/media	0.014s
ok  	dsh-api/internal/notifications	0.016s
ok  	dsh-api/internal/operationaloutbox	0.010s
ok  	dsh-api/internal/orders	0.004s
ok  	dsh-api/internal/partner	0.007s
ok  	dsh-api/internal/partnerdelivery	0.007s
ok  	dsh-api/internal/partnerfleet	0.004s
ok  	dsh-api/internal/pickup	0.011s
ok  	dsh-api/internal/platformpolicies	0.011s
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.013s
ok  	dsh-api/internal/store	0.010s
ok  	dsh-api/internal/support	0.006s
ok  	dsh-api/internal/wlt	0.012s
ok  	dsh-api/internal/wltoutbox	0.003s
FAIL

```

## DSH Go build

- Result: **FAIL** (exit `1`)

```text
# dsh-api/internal/http
internal/http/catalog_unified_routes.go:110:64: s.handleListCatalogMasterProducts undefined (type *protectedStoreServer has no field or method handleListCatalogMasterProducts)
internal/http/catalog_unified_routes.go:111:65: s.handleCreateCatalogMasterProduct undefined (type *protectedStoreServer has no field or method handleCreateCatalogMasterProduct)
internal/http/catalog_unified_routes.go:113:66: s.handleListCatalogProposals undefined (type *protectedStoreServer has no field or method handleListCatalogProposals)
internal/http/catalog_unified_routes.go:116:66: s.handleListCatalogPlatformPolicies undefined (type *protectedStoreServer has no field or method handleListCatalogPlatformPolicies)
internal/http/catalog_unified_routes.go:119:68: s.handleGetOperatorStoreAssortment undefined (type *protectedStoreServer has no field or method handleGetOperatorStoreAssortment)
internal/http/partner_fleet.go:75:35: undefined: partnerfleet.ListStoreConnections
internal/http/partner_fleet.go:129:35: undefined: partnerfleet.ListCaptainMemberships
internal/http/server.go:150:87: protected.handleCaptainCollectCod undefined (type *protectedStoreServer has no field or method handleCaptainCollectCod)
internal/http/server.go:151:85: protected.handleCaptainRemitCod undefined (type *protectedStoreServer has no field or method handleCaptainRemitCod)
internal/http/server.go:152:67: protected.handleCaptainFinanceCommissions undefined (type *protectedStoreServer has no field or method handleCaptainFinanceCommissions)
internal/http/server.go:152:67: too many errors

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

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:wlt-financial-boundary /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/wlt-financial-boundary-gate.mjs

wlt-financial-boundary-gate: PASS

```

## Go route extraction

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:go-routes-ci /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/go-routes-ci.mjs

GO_AST_ROUTES DSH: PASS routes=197
GO_AST_ROUTES WLT: PASS routes=69
GO_AST_ROUTES Identity: PASS routes=21
GO_AST_ROUTES Workforce: PASS routes=31
GO_AST_ROUTES: wrote transient diagnostics routes=318
GO_ROUTES_CI: PASS services=4 routes=318

```

## Broken imports

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:no-broken-imports /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/no-broken-imports.mjs

no-broken-imports: PASS

```

## Finance route-contract matrix

- Result: **PASS**

```text
finance route-contract matrix: PASS

```

## Finance Docker reset and comprehensive smoke

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
[31;1mException: [0m/home/runner/work/bthwani-suite-next/bthwani-suite-next/tools/scripts/financial-simulator-local.ps1:37[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m  37 | [0m     [36;1mthrow "$Name failed with exit code $LASTEXITCODE"[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mReset WLT and financial simulator containers and volumes failed with[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mexit code 1[0m

```

## Final verdict

**FAIL — one or more finance closure gates failed; see exact evidence above.**
