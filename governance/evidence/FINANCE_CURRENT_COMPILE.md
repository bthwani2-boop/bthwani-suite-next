# Finance Current Compile

- Source SHA: `c31d51ffb35fa7cd23b3a6eac3e5b2bbc22ccda3`
- Drift patcher exit: `0`
- DSH exit: `1`
- PowerShell parser exit: `0`

## DSH
```text
# dsh-api/internal/http
internal/http/orders.go:63:55: not enough arguments in call to orders.ListClientOrders
	have (*sql.DB, string, number)
	want (*sql.DB, string, string, int)
internal/http/orders.go:82:53: not enough arguments in call to orders.GetClientOrder
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	(cached)
ok  	dsh-api/internal/analytics	(cached)
ok  	dsh-api/internal/auth	(cached)
ok  	dsh-api/internal/cart	0.015s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.010s
ok  	dsh-api/internal/checkout	0.004s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.007s
ok  	dsh-api/internal/coupons	0.006s
ok  	dsh-api/internal/dispatch	0.005s
ok  	dsh-api/internal/fieldcommissionoutbox	0.009s
ok  	dsh-api/internal/fieldreadiness	0.009s
ok  	dsh-api/internal/health	(cached)
ok  	dsh-api/internal/homediscovery	(cached)
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.005s
ok  	dsh-api/internal/media	(cached)
ok  	dsh-api/internal/notifications	(cached)
ok  	dsh-api/internal/operationaloutbox	(cached)
ok  	dsh-api/internal/orders	0.008s
ok  	dsh-api/internal/partner	(cached)
ok  	dsh-api/internal/partnerdelivery	0.006s
ok  	dsh-api/internal/partnerfleet	(cached)
ok  	dsh-api/internal/pickup	0.008s
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
