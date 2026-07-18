# Finance Final Remote Validation

- Branch: `bassam`
- Source SHA: `3a5386290a02a08c93d63ba4e17e6ad939b11600`
- Executed at: `2026-07-18T00:52:29Z`

## Finance contract patcher

- Result: **PASS**

```text
Finance contracts patched idempotently.

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
🚀 services/dsh/contracts/dsh.openapi.yaml → services/dsh/clients/generated/dsh-api.ts [392.3ms]

```

## Generate WLT OpenAPI client

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 openapi:generate:wlt /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm dlx openapi-typescript@7.13.0 services/wlt/contracts/wlt.openapi.yaml -o services/wlt/clients/generated/wlt-api.ts

✨ openapi-typescript 7.13.0
🚀 services/wlt/contracts/wlt.openapi.yaml → services/wlt/clients/generated/wlt-api.ts [131.5ms]

```

## Git whitespace validation

- Result: **PASS**

```text

```

## WLT Go tests

- Result: **FAIL** (exit `1`)

```text
go: downloading github.com/lib/pq v1.12.3
# wlt-api/internal/commercial
internal/commercial/commercial_governed.go:64:203: undefined: stringValue
FAIL	wlt-api/cmd/wlt-api [build failed]
ok  	wlt-api/internal/cod	0.016s
FAIL	wlt-api/internal/commercial [build failed]
ok  	wlt-api/internal/dshnotify	0.005s
?   	wlt-api/internal/dshoutbox	[no test files]
?   	wlt-api/internal/health	[no test files]
FAIL	wlt-api/internal/http [build failed]
ok  	wlt-api/internal/ledger	0.010s
ok  	wlt-api/internal/payment	0.016s
ok  	wlt-api/internal/payout	0.013s
ok  	wlt-api/internal/provider	0.007s
ok  	wlt-api/internal/reconciliation	0.007s
ok  	wlt-api/internal/reference	0.004s
ok  	wlt-api/internal/refund	0.007s
ok  	wlt-api/internal/settlement	0.004s
?   	wlt-api/internal/shared	[no test files]
?   	wlt-api/internal/wallet	[no test files]
FAIL

```

## WLT Go build

- Result: **FAIL** (exit `1`)

```text
# wlt-api/internal/commercial
internal/commercial/commercial_governed.go:64:203: undefined: stringValue

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
# dsh-api/internal/wlt
internal/wlt/subscription_payment_generic.go:26:40: input.ProductReference undefined (type CreateSubscriptionPaymentSessionInput has no field or method ProductReference)
internal/wlt/subscription_payment_generic.go:33:58: input.ProductReference undefined (type CreateSubscriptionPaymentSessionInput has no field or method ProductReference)
# dsh-api/internal/marketing
internal/marketing/commercial_programs.go:163:6: nullableString redeclared in this block
	internal/marketing/audit.go:67:6: other declaration of nullableString
internal/marketing/commercial_programs.go:180:20: cannot use nullableString(approvedAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:180:35: cannot use approvedAt (variable of struct type sql.NullString) as string value in argument to nullableString
internal/marketing/commercial_programs.go:194:20: cannot use nullableString(approvedAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:194:35: cannot use approvedAt (variable of struct type sql.NullString) as string value in argument to nullableString
internal/marketing/commercial_programs.go:571:25: cannot use nullableString(startsAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:571:40: cannot use startsAt (variable of struct type sql.NullString) as string value in argument to nullableString
internal/marketing/commercial_programs.go:572:23: cannot use nullableString(endsAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:572:38: cannot use endsAt (variable of struct type sql.NullString) as string value in argument to nullableString
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	0.003s
ok  	dsh-api/internal/analytics	0.004s
ok  	dsh-api/internal/auth	0.012s
ok  	dsh-api/internal/cart	0.004s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.006s
FAIL	dsh-api/internal/checkout [build failed]
FAIL	dsh-api/internal/checkoutfinanceoutbox [build failed]
?   	dsh-api/internal/coupons	[no test files]
FAIL	dsh-api/internal/dispatch [build failed]
FAIL	dsh-api/internal/fieldcommissionoutbox [build failed]
FAIL	dsh-api/internal/fieldreadiness [build failed]
ok  	dsh-api/internal/health	0.009s
ok  	dsh-api/internal/homediscovery	0.012s
FAIL	dsh-api/internal/http [build failed]
FAIL	dsh-api/internal/marketing [build failed]
ok  	dsh-api/internal/media	0.018s
ok  	dsh-api/internal/notifications	0.007s
ok  	dsh-api/internal/operationaloutbox	0.009s
FAIL	dsh-api/internal/orders [build failed]
ok  	dsh-api/internal/partner	0.006s
FAIL	dsh-api/internal/partnerdelivery [build failed]
--- FAIL: TestGenerateCodeUsesNonAmbiguousAlphabet (0.00s)
    courier_codes_test.go:38: code contains ambiguous character: "3RDZ59L3U7"
FAIL
FAIL	dsh-api/internal/partnerfleet	0.005s
FAIL	dsh-api/internal/pickup [build failed]
ok  	dsh-api/internal/platformpolicies	0.003s
FAIL	dsh-api/internal/specialrequests [build failed]
ok  	dsh-api/internal/store	0.004s
ok  	dsh-api/internal/support	0.003s
FAIL	dsh-api/internal/wlt [build failed]
FAIL	dsh-api/internal/wltoutbox [build failed]
FAIL

```

## DSH Go build

- Result: **FAIL** (exit `1`)

```text
# dsh-api/internal/wlt
internal/wlt/subscription_payment_generic.go:26:40: input.ProductReference undefined (type CreateSubscriptionPaymentSessionInput has no field or method ProductReference)
internal/wlt/subscription_payment_generic.go:33:58: input.ProductReference undefined (type CreateSubscriptionPaymentSessionInput has no field or method ProductReference)
# dsh-api/internal/marketing
internal/marketing/commercial_programs.go:163:6: nullableString redeclared in this block
	internal/marketing/audit.go:67:6: other declaration of nullableString
internal/marketing/commercial_programs.go:180:20: cannot use nullableString(approvedAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:180:35: cannot use approvedAt (variable of struct type sql.NullString) as string value in argument to nullableString
internal/marketing/commercial_programs.go:194:20: cannot use nullableString(approvedAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:194:35: cannot use approvedAt (variable of struct type sql.NullString) as string value in argument to nullableString
internal/marketing/commercial_programs.go:571:25: cannot use nullableString(startsAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:571:40: cannot use startsAt (variable of struct type sql.NullString) as string value in argument to nullableString
internal/marketing/commercial_programs.go:572:23: cannot use nullableString(endsAt) (value of type interface{}) as *string value in assignment: need type assertion
internal/marketing/commercial_programs.go:572:38: cannot use endsAt (variable of struct type sql.NullString) as string value in argument to nullableString

```

## OpenAPI contracts lint

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 contracts:lint /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/important-scripts/contracts-foundation.mjs

contracts-foundation: PASS

```

## WLT TypeScript typecheck

- Result: **PASS**

```text

> @bthwani/wlt@0.0.0 typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/services/wlt
> tsc --noEmit -p tsconfig.json


```

## Control-panel TypeScript typecheck

- Result: **FAIL** (exit `2`)

```text

> @bthwani/control-panel@ typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/apps/control-panel/runtime
> tsc --noEmit -p tsconfig.json

../../../services/dsh/frontend/control-panel/finance/PayoutRequestsPanel.tsx(62,55): error TS18048: 'fractionDigits' is possibly 'undefined'.
../../../services/dsh/frontend/shared/marketing/use-marketing-controller.tsx(253,42): error TS2345: Argument of type '{ status: PartnerOfferStatus; title: string; valueLabel: string; eligibility: string; rejectionReason: string | undefined; marginRiskNote: string | undefined; }' is not assignable to parameter of type 'PartnerOfferWritePayload'.
  Property 'expectedVersion' is missing in type '{ status: PartnerOfferStatus; title: string; valueLabel: string; eligibility: string; rejectionReason: string | undefined; marginRiskNote: string | undefined; }' but required in type 'PartnerOfferWritePayload'.
../../../services/dsh/frontend/shared/marketing/use-marketing-controller.tsx(289,36): error TS2345: Argument of type '{ status: string; }' is not assignable to parameter of type 'PartnerOfferWritePayload'.
  Property 'expectedVersion' is missing in type '{ status: string; }' but required in type 'PartnerOfferWritePayload'.
 ELIFECYCLE  Command failed with exit code 2.

```

## WLT financial boundary guard

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 guard:wlt-financial-boundary /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/wlt-financial-boundary-gate.mjs

wlt-financial-boundary-gate: FAIL
- services/wlt/backend/internal/http/server.go WLT_SETTLEMENT_ROUTE_BINDING_DRIFT
 ELIFECYCLE  Command failed with exit code 1.

```

## Broken imports guard

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:no-broken-imports /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/no-broken-imports.mjs

no-broken-imports: PASS

```

## Finance Docker reset and smoke

- Result: **FAIL** (exit `1`)

```text
[31;1mParserError: [0m/home/runner/work/bthwani-suite-next/bthwani-suite-next/tools/scripts/financial-simulator-local.ps1:37[0m
[31;1m[0m[36;1mLine |[0m
[31;1m[0m[36;1m[36;1m  37 | [0m   Write-Host "[36;1m$Name:[0m PASS" -ForegroundColor Green[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m               ~~~~~~[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mVariable reference is not valid. ':' was not followed by a valid[0m
[31;1m[0m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m[31;1m[36;1m     | [31;1mvariable name character. Consider using ${} to delimit the name.[0m

```

## Final verdict

**FAIL — one or more finance closure gates failed; see sections above.**
