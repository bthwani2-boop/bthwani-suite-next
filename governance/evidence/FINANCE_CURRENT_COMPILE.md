# Finance Current Compile

- Source SHA: `73c2613c6365a0ccecc3f720443ac47b30fc9ccc`
- Drift patcher exit: `0`
- DSH exit: `1`
- PowerShell parser exit: `0`

## DSH
```text
# dsh-api/internal/http
internal/http/checkout.go:60:24: undefined: cart.ComputeCheckoutSnapshotTx
internal/http/checkout.go:88:3: unknown field CheckoutIntentID in struct literal of type checkout.PricingSnapshot
internal/http/checkout.go:98:30: undefined: coupons.ReserveForCheckoutTx
internal/http/checkout.go:99:4: unknown field TenantID in struct literal of type coupons.ReserveInput
internal/http/checkout.go:100:4: unknown field ClientID in struct literal of type coupons.ReserveInput
internal/http/checkout.go:103:4: unknown field CouponCode in struct literal of type coupons.ReserveInput
internal/http/checkout.go:105:4: unknown field DeliveryMinorUnits in struct literal of type coupons.ReserveInput
internal/http/checkout.go:112:29: undefined: coupons.ErrConflict
internal/http/server.go:230:61: protected.handleListFieldCatalogDomains undefined (type *protectedStoreServer has no field or method handleListFieldCatalogDomains)
internal/http/server.go:231:59: protected.handleListFieldCatalogNodes undefined (type *protectedStoreServer has no field or method handleListFieldCatalogNodes)
internal/http/server.go:231:59: too many errors
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	(cached)
ok  	dsh-api/internal/analytics	(cached)
ok  	dsh-api/internal/auth	(cached)
ok  	dsh-api/internal/cart	(cached)
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	(cached)
ok  	dsh-api/internal/checkout	0.005s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.005s
ok  	dsh-api/internal/coupons	0.005s
ok  	dsh-api/internal/dispatch	0.005s
ok  	dsh-api/internal/fieldcommissionoutbox	0.007s
ok  	dsh-api/internal/fieldreadiness	0.005s
ok  	dsh-api/internal/health	(cached)
ok  	dsh-api/internal/homediscovery	(cached)
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	(cached)
ok  	dsh-api/internal/media	(cached)
ok  	dsh-api/internal/notifications	(cached)
ok  	dsh-api/internal/operationaloutbox	(cached)
ok  	dsh-api/internal/orders	0.005s
ok  	dsh-api/internal/partner	(cached)
ok  	dsh-api/internal/partnerdelivery	0.005s
ok  	dsh-api/internal/partnerfleet	(cached)
ok  	dsh-api/internal/pickup	0.015s
ok  	dsh-api/internal/platformpolicies	(cached)
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.004s
ok  	dsh-api/internal/store	(cached)
ok  	dsh-api/internal/support	(cached)
ok  	dsh-api/internal/wlt	0.010s
ok  	dsh-api/internal/wltoutbox	0.004s
FAIL
```

## PowerShell parser
```text
```

## Verdict
**FAIL — inspect the exact output above.**
