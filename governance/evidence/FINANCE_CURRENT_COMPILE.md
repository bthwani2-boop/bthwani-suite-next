# Finance Current Compile

- Source SHA: `afa2ee55dce33003184e6b024055e355c21965d0`
- Drift patcher exit: `0`
- DSH exit: `1`
- PowerShell parser exit: `0`

## DSH
```text
# dsh-api/internal/http
internal/http/subscription_purchases.go:157:14: undefined: tenantIDForActor
internal/http/subscription_purchases.go:216:14: undefined: tenantIDForActor
internal/http/subscription_purchases.go:249:14: undefined: tenantIDForActor
internal/http/unified_handler_aliases.go:70:4: s.handlePurchaseSubscription undefined (type *protectedStoreServer has no field or method handlePurchaseSubscription)
internal/http/unified_handler_aliases.go:74:4: s.handleActivateSubscription undefined (type *protectedStoreServer has no field or method handleActivateSubscription)
internal/http/wlt_events.go:77:99: not enough arguments in call to checkout.ApplyWltPaymentEvent
	have (*sql.DB, string, string, string)
	want (*sql.DB, string, string, string, string)
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	(cached)
ok  	dsh-api/internal/analytics	(cached)
ok  	dsh-api/internal/auth	(cached)
ok  	dsh-api/internal/cart	0.003s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.008s
ok  	dsh-api/internal/checkout	0.006s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.007s
ok  	dsh-api/internal/coupons	0.004s
ok  	dsh-api/internal/dispatch	0.004s
ok  	dsh-api/internal/fieldcommissionoutbox	0.009s
ok  	dsh-api/internal/fieldreadiness	0.010s
ok  	dsh-api/internal/health	(cached)
ok  	dsh-api/internal/homediscovery	(cached)
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.004s
ok  	dsh-api/internal/media	(cached)
ok  	dsh-api/internal/notifications	(cached)
ok  	dsh-api/internal/operationaloutbox	(cached)
ok  	dsh-api/internal/orders	0.004s
ok  	dsh-api/internal/partner	(cached)
ok  	dsh-api/internal/partnerdelivery	0.003s
ok  	dsh-api/internal/partnerfleet	(cached)
ok  	dsh-api/internal/pickup	0.007s
ok  	dsh-api/internal/platformpolicies	(cached)
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.003s
ok  	dsh-api/internal/store	(cached)
ok  	dsh-api/internal/support	(cached)
ok  	dsh-api/internal/wlt	0.008s
ok  	dsh-api/internal/wltoutbox	0.003s
FAIL
```

## PowerShell parser
```text
```

## Verdict
**FAIL — inspect exact output above.**
