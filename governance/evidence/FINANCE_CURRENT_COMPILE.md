# Finance Current Compile

- Source SHA: `8032f779c9c32849006bfce10060c5c323da6803`
- Order tenant patcher exit: `0`
- Finance drift patcher exit: `0`
- DSH exit: `1`
- PowerShell parser exit: `0`

## DSH
```text
# dsh-api/internal/coupons
internal/coupons/governed.go:15:2: ErrFundingPolicy redeclared in this block
	internal/coupons/funding.go:11:5: other declaration of ErrFundingPolicy
internal/coupons/governed_read.go:8:6: GetGoverned redeclared in this block
	internal/coupons/governed.go:131:6: other declaration of GetGoverned
internal/coupons/governed_write.go:13:5: ErrConflict redeclared in this block
	internal/coupons/governed.go:14:2: other declaration of ErrConflict
internal/coupons/governed_write.go:15:6: GovernedCreateInput redeclared in this block
	internal/coupons/governed.go:31:6: other declaration of GovernedCreateInput
internal/coupons/governed_write.go:22:6: GovernedUpdateInput redeclared in this block
	internal/coupons/governed.go:39:6: other declaration of GovernedUpdateInput
internal/coupons/governed_write.go:29:6: CreateGoverned redeclared in this block
	internal/coupons/governed.go:140:6: other declaration of CreateGoverned
internal/coupons/governed_write.go:66:27: input.PlatformShareBPS undefined (type GovernedCreateInput has no field or method PlatformShareBPS, but does have field PlatformShareBps)
internal/coupons/governed_write.go:67:27: input.FundingPartnerID undefined (type GovernedCreateInput has no field or method FundingPartnerID)
internal/coupons/governed_write.go:126:6: UpdateGoverned redeclared in this block
	internal/coupons/governed.go:233:6: other declaration of UpdateGoverned
internal/coupons/governed_write.go:162:56: input.PlatformShareBPS undefined (type GovernedUpdateInput has no field or method PlatformShareBPS, but does have field PlatformShareBps)
internal/coupons/governed_write.go:162:56: too many errors
# dsh-api/internal/wlt
internal/wlt/subscription_payment_generic.go:26:40: input.CommercialProductReference undefined (type CreateSubscriptionPaymentSessionInput has no field or method CommercialProductReference)
internal/wlt/subscription_payment_generic.go:31:40: input.AmountMinorUnits undefined (type CreateSubscriptionPaymentSessionInput has no field or method AmountMinorUnits)
internal/wlt/subscription_payment_generic.go:32:40: input.Currency undefined (type CreateSubscriptionPaymentSessionInput has no field or method Currency)
internal/wlt/subscription_payment_generic.go:33:58: input.CommercialProductReference undefined (type CreateSubscriptionPaymentSessionInput has no field or method CommercialProductReference)
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	(cached)
ok  	dsh-api/internal/analytics	(cached)
ok  	dsh-api/internal/auth	(cached)
ok  	dsh-api/internal/cart	0.003s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.004s
FAIL	dsh-api/internal/checkout [build failed]
FAIL	dsh-api/internal/checkoutfinanceoutbox [build failed]
FAIL	dsh-api/internal/coupons [build failed]
FAIL	dsh-api/internal/dispatch [build failed]
FAIL	dsh-api/internal/fieldcommissionoutbox [build failed]
FAIL	dsh-api/internal/fieldreadiness [build failed]
ok  	dsh-api/internal/health	(cached)
ok  	dsh-api/internal/homediscovery	(cached)
FAIL	dsh-api/internal/http [build failed]
FAIL	dsh-api/internal/marketing [build failed]
ok  	dsh-api/internal/media	(cached)
ok  	dsh-api/internal/notifications	(cached)
ok  	dsh-api/internal/operationaloutbox	(cached)
FAIL	dsh-api/internal/orders [build failed]
ok  	dsh-api/internal/partner	(cached)
FAIL	dsh-api/internal/partnerdelivery [build failed]
ok  	dsh-api/internal/partnerfleet	(cached)
FAIL	dsh-api/internal/pickup [build failed]
ok  	dsh-api/internal/platformpolicies	(cached)
FAIL	dsh-api/internal/promotionfundingoutbox [build failed]
FAIL	dsh-api/internal/specialrequests [build failed]
ok  	dsh-api/internal/store	(cached)
ok  	dsh-api/internal/support	(cached)
FAIL	dsh-api/internal/wlt [build failed]
FAIL	dsh-api/internal/wltoutbox [build failed]
FAIL
```

## PowerShell parser
```text
```

## Verdict
**FAIL — inspect exact output above.**
