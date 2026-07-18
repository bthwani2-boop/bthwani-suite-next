# Finance Final Remote Validation

- Branch: `bassam`
- Source SHA: `a84232dd6d6a80a04531dac74dc21834b78fc670`
- Executed at: `2026-07-18T01:06:06Z`

## Finance source drift patcher

- Result: **PASS**

```text
Finance source drift closure complete; removed 7 tenant fallback(s).

```

## Finance contract patcher

- Result: **PASS**

```text
Finance contracts patched idempotently.

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
file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72c257fe-8f8/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/lib/redoc.mjs:74
      throw new Error(errorMessage);
            ^

Error: Can't resolve $ref at #/paths/~1dsh~1control-panel~1finance~1settlement-policies~1{partnerId}/put/responses/400
    at _processProblems (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72c257fe-8f8/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/lib/redoc.mjs:74:13)
    at validateAndBundle (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72c257fe-8f8/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/lib/redoc.mjs:116:3)
    at async openapiTS (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72c257fe-8f8/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/dist/index.mjs:40:18)
    at async generateSchema (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72c257fe-8f8/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/bin/cli.js:143:5)
    at async main (file:///home/runner/.cache/pnpm/dlx/140c15d98aff76c652861295ffa050e74ddb4d24b5f22c757b487705a2b44acd/19f72c257fe-8f8/node_modules/.pnpm/openapi-typescript@7.13.0_typescript@5.9.3/node_modules/openapi-typescript/bin/cli.js:280:20)

Node.js v24.17.0
 ELIFECYCLE  Command failed with exit code 1.

```

## Generate WLT OpenAPI client

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 openapi:generate:wlt /home/runner/work/bthwani-suite-next/bthwani-suite-next
> pnpm dlx openapi-typescript@7.13.0 services/wlt/contracts/wlt.openapi.yaml -o services/wlt/clients/generated/wlt-api.ts

✨ openapi-typescript 7.13.0
🚀 services/wlt/contracts/wlt.openapi.yaml → services/wlt/clients/generated/wlt-api.ts [83ms]

```

## Go formatting

- Result: **FAIL** (exit `2`)

```text
lstat services/dsh/backend/internal/wlt/settlement_client.go: no such file or directory

```

## Git whitespace validation

- Result: **FAIL** (exit `2`)

```text
governance/evidence/FINANCE_FINAL_REMOTE_VALIDATION.md:81: new blank line at EOF.

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
ok  	wlt-api/internal/cod	0.009s
ok  	wlt-api/internal/commercial	0.008s
ok  	wlt-api/internal/dshnotify	0.014s
?   	wlt-api/internal/dshoutbox	[no test files]
?   	wlt-api/internal/health	[no test files]
ok  	wlt-api/internal/http	0.007s
ok  	wlt-api/internal/ledger	0.005s
ok  	wlt-api/internal/payment	0.006s
ok  	wlt-api/internal/payout	0.004s
?   	wlt-api/internal/promotionfunding	[no test files]
ok  	wlt-api/internal/provider	0.004s
ok  	wlt-api/internal/reconciliation	0.008s
ok  	wlt-api/internal/reference	0.006s
ok  	wlt-api/internal/refund	0.005s
ok  	wlt-api/internal/settlement	0.004s
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
go: downloading golang.org/x/crypto v0.51.0
go: downloading github.com/rs/xid v1.6.0
go: downloading github.com/tinylib/msgp v1.6.1
go: downloading github.com/klauspost/cpuid/v2 v2.2.11
go: downloading github.com/philhofer/fwd v1.2.0
go: downloading golang.org/x/text v0.40.0
# dsh-api/internal/partnerfleet
internal/partnerfleet/courier_codes.go:10:2: "fmt" imported and not used
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	0.003s
ok  	dsh-api/internal/analytics	0.003s
ok  	dsh-api/internal/auth	0.006s
ok  	dsh-api/internal/cart	0.006s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.004s
ok  	dsh-api/internal/checkout	0.005s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.004s
?   	dsh-api/internal/coupons	[no test files]
ok  	dsh-api/internal/dispatch	0.005s
ok  	dsh-api/internal/fieldcommissionoutbox	0.005s
ok  	dsh-api/internal/fieldreadiness	0.003s
ok  	dsh-api/internal/health	0.005s
ok  	dsh-api/internal/homediscovery	0.005s
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.006s
ok  	dsh-api/internal/media	0.005s
ok  	dsh-api/internal/notifications	0.006s
ok  	dsh-api/internal/operationaloutbox	0.006s
ok  	dsh-api/internal/orders	0.004s
ok  	dsh-api/internal/partner	0.004s
ok  	dsh-api/internal/partnerdelivery	0.004s
FAIL	dsh-api/internal/partnerfleet [build failed]
ok  	dsh-api/internal/pickup	0.006s
ok  	dsh-api/internal/platformpolicies	0.006s
ok  	dsh-api/internal/specialrequests	0.004s
ok  	dsh-api/internal/store	0.010s
ok  	dsh-api/internal/support	0.002s
ok  	dsh-api/internal/wlt	0.008s
ok  	dsh-api/internal/wltoutbox	0.003s
FAIL

```

## DSH Go build

- Result: **FAIL** (exit `1`)

```text
# dsh-api/internal/partnerfleet
internal/partnerfleet/courier_codes.go:10:2: "fmt" imported and not used

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

- Result: **PASS**

```text

> @bthwani/control-panel@ typecheck /home/runner/work/bthwani-suite-next/bthwani-suite-next/apps/control-panel/runtime
> tsc --noEmit -p tsconfig.json


```

## WLT financial boundary guard

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 guard:wlt-financial-boundary /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/wlt-financial-boundary-gate.mjs

node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open '/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/wlt/settlement_client.go'
    at Object.readFileSync (node:fs:441:20)
    at read (file:///home/runner/work/bthwani-suite-next/bthwani-suite-next/tools/guards/_guard-utils.mjs:130:13)
    at file:///home/runner/work/bthwani-suite-next/bthwani-suite-next/tools/guards/wlt-financial-boundary-gate.mjs:155:19
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:633:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/home/runner/work/bthwani-suite-next/bthwani-suite-next/services/dsh/backend/internal/wlt/settlement_client.go'
}

Node.js v24.17.0
 ELIFECYCLE  Command failed with exit code 1.

```

## Runtime config guard

- Result: **PASS**

```text

> bthwani-suite-next@0.0.0 guard:runtime-config /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/runtime-config-gate.mjs

runtime-config-gate: PASS

```

## API binding guard

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 guard:api-binding /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/api-binding-gate.mjs

api-binding-gate: FAIL
- services/dsh/frontend/shared/marketing/marketing.api.ts UNREGISTERED PATH: "/dsh/operator/marketing/coupons" not found in master-indexed OpenAPI contracts
- services/dsh/frontend/shared/marketing/marketing.api.ts UNREGISTERED PATH: "/dsh/operator/marketing/coupons" not found in master-indexed OpenAPI contracts
- services/dsh/frontend/shared/marketing/marketing.api.ts UNREGISTERED PATH: "/dsh/operator/marketing/coupons/${id}" not found in master-indexed OpenAPI contracts
 ELIFECYCLE  Command failed with exit code 1.

```

## Backend API binding guard

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 guard:backend-api-binding /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/backend-api-binding-gate.mjs

backend-api-binding-gate: FAIL
- services/dsh/backend/internal/http/server.go:148 FORBIDDEN_ROUTE: Route "POST /dsh/captain/finance/cod-records/{recordId}/collect" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:149 FORBIDDEN_ROUTE: Route "POST /dsh/captain/finance/cod-records/{recordId}/remit" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:150 FORBIDDEN_ROUTE: Route "GET /dsh/captain/finance/commissions" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:151 FORBIDDEN_ROUTE: Route "GET /dsh/captain/finance/payouts" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:152 FORBIDDEN_ROUTE: Route "POST /dsh/captain/finance/payouts" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:153 FORBIDDEN_ROUTE: Route "GET /dsh/field/finance/commissions" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:154 FORBIDDEN_ROUTE: Route "GET /dsh/field/finance/wallet" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:155 FORBIDDEN_ROUTE: Route "GET /dsh/field/finance/payouts" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:156 FORBIDDEN_ROUTE: Route "POST /dsh/field/finance/payouts" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:157 FORBIDDEN_ROUTE: Route "GET /dsh/field/finance/payout-destinations" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:158 FORBIDDEN_ROUTE: Route "POST /dsh/field/finance/payout-destinations" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:159 FORBIDDEN_ROUTE: Route "PATCH /dsh/field/finance/payout-destinations/{destinationId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:160 FORBIDDEN_ROUTE: Route "DELETE /dsh/field/finance/payout-destinations/{destinationId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:163 FORBIDDEN_ROUTE: Route "POST /dsh/client/support/tickets" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:164 FORBIDDEN_ROUTE: Route "GET /dsh/client/support/tickets" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:165 FORBIDDEN_ROUTE: Route "GET /dsh/client/support/tickets/{ticketId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:166 FORBIDDEN_ROUTE: Route "POST /dsh/client/support/tickets/{ticketId}/messages" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:168 FORBIDDEN_ROUTE: Route "GET /dsh/operator/support/tickets/{ticketId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:170 FORBIDDEN_ROUTE: Route "POST /dsh/operator/support/tickets/{ticketId}/messages" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:171 FORBIDDEN_ROUTE: Route "POST /dsh/operator/support/tickets/{ticketId}/escalate" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:172 FORBIDDEN_ROUTE: Route "GET /dsh/operator/escalations" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:173 FORBIDDEN_ROUTE: Route "POST /dsh/operator/escalations/{escalationId}/resolve" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:176 FORBIDDEN_ROUTE: Route "GET /dsh/operator/analytics/operations" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:192 FORBIDDEN_ROUTE: Route "GET /dsh/operator/marketing/coupons" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:193 FORBIDDEN_ROUTE: Route "POST /dsh/operator/marketing/coupons" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:194 FORBIDDEN_ROUTE: Route "PATCH /dsh/operator/marketing/coupons/{couponId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:208 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:209 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:210 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/domains/{domainId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:211 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:212 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:213 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/nodes/{nodeId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:214 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/master-products" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:215 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/master-products" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:216 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/master-products/{productId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:217 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/proposals" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:218 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/proposals/{proposalId}/decision" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:219 FORBIDDEN_ROUTE: Route "POST /dsh/catalog/proposals/{proposalId}/transitions" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:220 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/policies" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:221 FORBIDDEN_ROUTE: Route "PATCH /dsh/catalog/policies/{policyId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:222 FORBIDDEN_ROUTE: Route "GET /dsh/catalog/stores/{storeId}/assortment" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:223 FORBIDDEN_ROUTE: Route "PUT /dsh/catalog/stores/{storeId}/assortment/{masterProductId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:224 FORBIDDEN_ROUTE: Route "GET /dsh/field/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:225 FORBIDDEN_ROUTE: Route "GET /dsh/field/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:227 FORBIDDEN_ROUTE: Route "GET /dsh/field/catalog/stores/{storeId}/assortment" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:228 FORBIDDEN_ROUTE: Route "PUT /dsh/field/catalog/stores/{storeId}/assortment/{masterProductId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:229 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/domains" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:230 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/nodes" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:232 FORBIDDEN_ROUTE: Route "POST /dsh/partner/catalog/proposals" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:233 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/proposals" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:234 FORBIDDEN_ROUTE: Route "GET /dsh/partner/catalog/assortment" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/backend/internal/http/server.go:235 FORBIDDEN_ROUTE: Route "PUT /dsh/partner/catalog/assortment/{masterProductId}" is registered in Go router but not documented exactly in composed contracts: services/dsh/contracts/dsh.openapi.yaml, services/dsh/contracts/dsh.marketing-commercial.openapi.yaml, services/dsh/contracts/dsh.partner-fleet.openapi.yaml
- services/dsh/contracts/dsh.openapi.yaml:19 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/wallet" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:51 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/commissions" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:86 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/ledger-entries" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:104 MISSING_IMPLEMENTATION: Route "GET /dsh/field/me/finance/payout-requests" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:133 MISSING_IMPLEMENTATION: Route "POST /dsh/field/me/finance/payout-requests" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:325 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/workforce/media/uploads" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:893 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/domains" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:899 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/domains" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:907 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/domains/{domainId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:937 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/nodes" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:950 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/nodes" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:958 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/nodes/{nodeId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:986 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/master-products" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1034 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/master-products" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1042 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/master-products/{productId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1073 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/product-proposals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1099 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/product-proposals/{proposalId}/decision" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1112 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/product-proposals/{proposalId}/transition" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1125 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/platform-policies" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1133 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/platform-policies/{policyId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1166 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/platform-policies/{policyId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1199 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/seed-status" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1208 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/assets" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1234 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/upload-intents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1281 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/{assetId}/complete" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1295 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/catalog/assets/{assetId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1321 MISSING_IMPLEMENTATION: Route "DELETE /dsh/operator/catalog/assets/{assetId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1335 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/{assetId}/review" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1371 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/catalog/assets/{assetId}/link" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1385 MISSING_IMPLEMENTATION: Route "DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1411 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/reels" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1441 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/reels/{reelId}/review" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1474 MISSING_IMPLEMENTATION: Route "POST /dsh/partner/reels" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1525 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/catalog/asset-links" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1543 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/domains/{domainId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1561 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1579 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/master-products/{productId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1597 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1615 MISSING_IMPLEMENTATION: Route "PUT /dsh/stores/{storeId}/images/{role}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1645 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/stores/{storeId}/assortment" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1654 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1669 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/catalog/taxonomy" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1685 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/stores/{storeId}/assortment" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1694 MISSING_IMPLEMENTATION: Route "PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1709 MISSING_IMPLEMENTATION: Route "POST /dsh/partner/catalog/product-proposals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1717 MISSING_IMPLEMENTATION: Route "PUT /dsh/partner/catalog/product-proposals/{proposalId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1730 MISSING_IMPLEMENTATION: Route "GET /dsh/field/catalog/taxonomy" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1746 MISSING_IMPLEMENTATION: Route "PUT /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1765 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/assortment" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1779 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/catalog/product-proposals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:1792 MISSING_IMPLEMENTATION: Route "PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:2827 MISSING_IMPLEMENTATION: Route "POST /dsh/control-panel/finance/settlements/from-delivered-orders" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:2857 MISSING_IMPLEMENTATION: Route "PUT /dsh/control-panel/finance/settlement-policies/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3000 MISSING_IMPLEMENTATION: Route "GET /dsh/catalog-approvals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3025 MISSING_IMPLEMENTATION: Route "POST /dsh/catalog-approvals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3045 MISSING_IMPLEMENTATION: Route "GET /dsh/catalog-approvals/{recordId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3065 MISSING_IMPLEMENTATION: Route "POST /dsh/catalog-approvals/{recordId}/transition" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3091 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/catalog-approvals" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3106 MISSING_IMPLEMENTATION: Route "POST /dsh/field/stores/{storeId}/visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3127 MISSING_IMPLEMENTATION: Route "GET /dsh/field/stores/{storeId}/visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3144 MISSING_IMPLEMENTATION: Route "GET /dsh/field/work-queue" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3159 MISSING_IMPLEMENTATION: Route "POST /dsh/field/visits/{visitId}/complete" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3180 MISSING_IMPLEMENTATION: Route "PUT /dsh/field/visits/{visitId}/checks" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3204 MISSING_IMPLEMENTATION: Route "GET /dsh/field/visits/{visitId}/checks" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3224 MISSING_IMPLEMENTATION: Route "POST /dsh/field/stores/{storeId}/escalations" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3247 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/field-readiness/escalations" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3269 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/field-readiness/escalations/{escalationId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3295 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/stores/{storeId}/onboarding-status" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3314 MISSING_IMPLEMENTATION: Route "POST /dsh/support/tickets" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3333 MISSING_IMPLEMENTATION: Route "GET /dsh/support/tickets" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3348 MISSING_IMPLEMENTATION: Route "GET /dsh/support/tickets/{ticketId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3369 MISSING_IMPLEMENTATION: Route "POST /dsh/support/tickets/{ticketId}/messages" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3393 MISSING_IMPLEMENTATION: Route "GET /dsh/support/tickets/{ticketId}/messages" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3461 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/incidents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3480 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/incidents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3502 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/incidents/{incidentId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3529 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/platform" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3544 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/orders" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3563 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/delivery" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3601 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/analytics/stores" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3616 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/analytics/performance" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3671 MISSING_IMPLEMENTATION: Route "GET /dsh/notifications" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3686 MISSING_IMPLEMENTATION: Route "POST /dsh/notifications/{notificationId}/read" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3707 MISSING_IMPLEMENTATION: Route "POST /dsh/notifications/read-all" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3726 MISSING_IMPLEMENTATION: Route "PUT /dsh/notifications/preferences" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3747 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/notifications/config" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:3760 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/notifications/config" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4084 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/zones" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4097 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/platform/zones" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4118 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/platform/zones/{zoneId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4145 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/sla-rules" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4164 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/platform/sla-rules" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4185 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/capacity" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4204 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/platform/capacity" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4225 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/serviceability/{zoneId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4246 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/platform/store-onboarding-fee" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4260 MISSING_IMPLEMENTATION: Route "PUT /dsh/operator/platform/store-onboarding-fee" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4281 MISSING_IMPLEMENTATION: Route "GET /dsh/platform/store-onboarding-fee" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4298 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/roles" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4311 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/roles" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4332 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/staff" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4347 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/staff/{staffId}/roles" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4376 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4403 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4425 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4446 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners/{partnerId}/transition" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4479 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/readiness" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4500 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4519 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4545 MISSING_IMPLEMENTATION: Route "PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4576 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/stores" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4595 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/partners/{partnerId}/stores" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4622 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/audit" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4643 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/partners/{partnerId}/field-visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4670 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/activation/status" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4686 MISSING_IMPLEMENTATION: Route "GET /dsh/partner/activation/readiness" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4897 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4923 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/drafts" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4945 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4964 MISSING_IMPLEMENTATION: Route "PATCH /dsh/field/partners/{partnerId}" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:4991 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/readiness" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5013 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/store" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5038 MISSING_IMPLEMENTATION: Route "PATCH /dsh/field/partners/{partnerId}/store" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5071 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5096 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/documents" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5178 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5204 MISSING_IMPLEMENTATION: Route "GET /dsh/field/partners/{partnerId}/field-visits" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5231 MISSING_IMPLEMENTATION: Route "POST /dsh/field/partners/{partnerId}/submit" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5267 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/partners" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5282 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/partners/{partnerId}/activate" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5309 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/partners/{partnerId}/block" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5336 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/captains" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5351 MISSING_IMPLEMENTATION: Route "POST /dsh/operator/admin/captains/{captainId}/credential" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/dsh/contracts/dsh.openapi.yaml:5378 MISSING_IMPLEMENTATION: Route "GET /dsh/operator/admin/audit" is documented in OpenAPI but not registered exactly in services/dsh/backend/internal/http/server.go
- services/wlt/contracts/wlt.openapi.yaml:949 MISSING_MUTATION_METADATA: POST /wlt/settlements must set x-bthwani-mutation-approved: false
- services/wlt/contracts/wlt.commercial.openapi.yaml:35 MISSING_FINANCIAL_READ_HEADER: WLT financial read route "GET /wlt/commercial/products/{productReference}" is missing required header "Authorization"
- services/wlt/contracts/wlt.commercial.openapi.yaml:69 MISSING_FINANCIAL_READ_HEADER: WLT financial read route "GET /wlt/commercial/clients/{clientId}/benefits" is missing required header "Authorization"
- services/dsh/backend/internal/wlt/commercial.go:204 FORBIDDEN_CROSS_SERVICE_CALL: Outbound request "GET /wlt/commercial/clients/" to WLT is not documented in its OpenAPI contract
 ELIFECYCLE  Command failed with exit code 1.

```

## Frontend feature binding guard

- Result: **FAIL** (exit `1`)

```text

> bthwani-suite-next@0.0.0 guard:frontend-feature-binding /home/runner/work/bthwani-suite-next/bthwani-suite-next
> node tools/guards/frontend-feature-binding-gate.mjs

frontend-feature-binding-gate: checked 25 STATIC_BINDING entries
frontend-feature-binding-gate: proves static dependency and contract reachability only; runtime requires same-commit runtime evidence
frontend-feature-binding-gate: FAIL
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING client.checkout -> dsh.client.checkout
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING client.orders-list -> dsh.client.orders
- services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE client.order-tracking -> services/dsh/frontend/shared/orders/orders.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING client.order-tracking -> dsh.client.orders
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.orders-inbox -> dsh.client.orders
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING partner.catalog-workspace -> GET /dsh/partner/catalog/taxonomy
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.catalog-workspace -> dsh.client.catalog
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING partner.product-proposal -> POST /dsh/partner/catalog/product-proposals
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.product-proposal -> dsh.client.catalog
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING partner.taxonomy-browse -> GET /dsh/partner/catalog/taxonomy
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.taxonomy-browse -> dsh.client.catalog
- services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE partner.store-settings -> services/dsh/frontend/shared/store/store-admin.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING partner.store-settings -> dsh.store.discovery
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.assignments -> dsh.client.dispatch
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.delivery-map -> dsh.client.dispatch
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.pickup-dropoff -> dsh.client.dispatch
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING captain.pod -> dsh.client.dispatch
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING field.partner-onboarding -> POST /dsh/field/partners/{partnerId}/submit
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.partner-onboarding -> dsh.field.readiness
- services/dsh/frontend/app-field/stores/DshFieldStoreVerificationScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE field.store-verification -> services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.store-verification -> dsh.field.readiness
- services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE field.media-upload -> services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.media-upload -> dsh.field.readiness
- services/dsh/frontend/app-field/stores/DshFieldStoresHistoryScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE field.visit-history -> services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING field.visit-history -> GET /dsh/field/stores/{storeId}/visits
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING field.visit-history -> dsh.field.readiness
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.operations-hub -> dsh.client.orders
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.live-orders -> dsh.client.orders
- services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.cart-activity -> services/dsh/frontend/shared/operations/use-operations-controller.tsx
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.cart-activity -> dsh.client.cart
- services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.checkout-activity -> services/dsh/frontend/shared/operations/use-operations-controller.tsx
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.checkout-activity -> dsh.client.checkout
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.analytics -> GET /dsh/operator/analytics/platform
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.analytics -> dsh.operator.analytics
- services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.catalog-approvals -> services/dsh/frontend/shared/partner/use-partners-controller.tsx
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.catalog-approvals -> GET /dsh/catalog-approvals
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.catalog-approvals -> dsh.admin
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.partner-activation -> GET /dsh/operator/partners
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.partner-activation -> dsh.partner.activation
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.support-tickets -> dsh.support.hub
- services/dsh/frontend/control-panel/support/PlatformNotificationConfigScreen.tsx SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE control.notification-config -> services/dsh/frontend/shared/support/use-support-controller.tsx
- services/dsh/backend/internal/http/server.go BACKEND_ROUTE_MISSING control.notification-config -> GET /dsh/operator/notifications/config
- services/dsh/service.manifest.ts SERVICE_MANIFEST_CAPABILITY_MISSING control.notification-config -> dsh.notifications
 ELIFECYCLE  Command failed with exit code 1.

```

## Go route extraction guard

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

**FAIL — one or more finance closure gates failed; see sections above.**
