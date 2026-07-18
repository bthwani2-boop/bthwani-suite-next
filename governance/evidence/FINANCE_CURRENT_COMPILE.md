# Finance Current Compile

- Source SHA: `27ec691c09f78bdac1668bfc2bc75e3a202562f3`
- Order tenant patcher exit: `0`
- Finance drift patcher exit: `0`
- DSH exit: `1`
- PowerShell parser exit: `0`

## Order tenant patcher
```text
Client order call sites are tenant-scoped.
```

## DSH
```text
# dsh-api/internal/http
internal/http/coupons.go:19:30: undefined: coupons.ErrConflict
internal/http/coupons.go:108:3: unknown field FundingSource in struct literal of type coupons.CreateInput
internal/http/coupons.go:108:38: unknown field PlatformShareBps in struct literal of type coupons.CreateInput
internal/http/coupons.go:108:79: unknown field PartnerShareBps in struct literal of type coupons.CreateInput
internal/http/coupons.go:108:118: unknown field SponsorID in struct literal of type coupons.CreateInput
internal/http/coupons.go:193:3: unknown field FundingSource in struct literal of type coupons.UpdateInput
internal/http/coupons.go:193:38: unknown field PlatformShareBps in struct literal of type coupons.UpdateInput
internal/http/coupons.go:193:79: unknown field PartnerShareBps in struct literal of type coupons.UpdateInput
internal/http/coupons.go:193:118: unknown field SponsorID in struct literal of type coupons.UpdateInput
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	(cached)
ok  	dsh-api/internal/analytics	(cached)
ok  	dsh-api/internal/auth	(cached)
ok  	dsh-api/internal/cart	0.017s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.006s
ok  	dsh-api/internal/checkout	0.005s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.005s
ok  	dsh-api/internal/coupons	0.005s
ok  	dsh-api/internal/dispatch	0.005s
ok  	dsh-api/internal/fieldcommissionoutbox	0.016s
ok  	dsh-api/internal/fieldreadiness	0.006s
ok  	dsh-api/internal/health	(cached)
ok  	dsh-api/internal/homediscovery	(cached)
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.006s
ok  	dsh-api/internal/media	(cached)
ok  	dsh-api/internal/notifications	(cached)
ok  	dsh-api/internal/operationaloutbox	(cached)
ok  	dsh-api/internal/orders	0.004s
ok  	dsh-api/internal/partner	(cached)
ok  	dsh-api/internal/partnerdelivery	0.005s
ok  	dsh-api/internal/partnerfleet	(cached)
ok  	dsh-api/internal/pickup	0.007s
ok  	dsh-api/internal/platformpolicies	(cached)
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.004s
ok  	dsh-api/internal/store	(cached)
ok  	dsh-api/internal/support	(cached)
ok  	dsh-api/internal/wlt	0.011s
ok  	dsh-api/internal/wltoutbox	0.003s
FAIL
```

## PowerShell parser
```text
```

## Verdict
**FAIL — inspect exact output above.**
