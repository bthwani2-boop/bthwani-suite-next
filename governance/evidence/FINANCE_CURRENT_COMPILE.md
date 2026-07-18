# Finance Current Compile

- Source SHA: `cf6c6fcbd18ffed7db65fc145a8c08471b77a870`
- Drift patcher exit: `0`
- DSH exit: `1`
- PowerShell parser exit: `0`

## Drift patcher
```text
Final finance route, contract and runtime drifts closed.
```

## DSH
```text
go: downloading github.com/lib/pq v1.12.3
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
# dsh-api/internal/checkout [dsh-api/internal/checkout.test]
internal/checkout/checkout_db_test.go:78:64: not enough arguments in call to AttachWltPaymentSession
	have (*sql.DB, string, string, string)
	want (*sql.DB, string, string, string, string)
internal/checkout/checkout_db_test.go:82:48: not enough arguments in call to CancelIntent
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/checkout/checkout_db_test.go:130:48: not enough arguments in call to CancelIntent
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/checkout/checkout_test.go:55:58: not enough arguments in call to ApplyWltPaymentEvent
	have (nil, string, string, string)
	want (*sql.DB, string, string, string, string)
internal/checkout/checkout_test.go:58:57: not enough arguments in call to ApplyWltPaymentEvent
	have (nil, string, string, string)
	want (*sql.DB, string, string, string, string)
internal/checkout/checkout_test.go:61:66: not enough arguments in call to ApplyWltPaymentEvent
	have (nil, string, string, string)
	want (*sql.DB, string, string, string, string)
internal/checkout/checkout_test.go:67:63: not enough arguments in call to ApplyWltPaymentEvent
	have (nil, string, string, string)
	want (*sql.DB, string, string, string, string)
# dsh-api/internal/http
internal/http/checkout.go:158:76: not enough arguments in call to checkout.MarkWltHandoffFailed
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/http/checkout.go:191:78: not enough arguments in call to checkout.MarkWltHandoffFailed
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/http/checkout.go:208:76: not enough arguments in call to checkout.AttachWltPaymentSession
	have (*sql.DB, string, string, string)
	want (*sql.DB, string, string, string, string)
internal/http/checkout.go:217:57: not enough arguments in call to checkout.MarkWltHandoffFailed
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/http/checkout.go:242:52: not enough arguments in call to checkout.GetIntent
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/http/checkout.go:269:55: not enough arguments in call to checkout.CancelIntent
	have (*sql.DB, string, string)
	want (*sql.DB, string, string, string)
internal/http/server.go:175:84: protected.handleResolveEscalation undefined (type *protectedStoreServer has no field or method handleResolveEscalation)
internal/http/server.go:178:69: protected.handleGetOperationsAnalytics undefined (type *protectedStoreServer has no field or method handleGetOperationsAnalytics)
internal/http/server.go:179:66: protected.handleGetSupportAnalytics undefined (type *protectedStoreServer has no field or method handleGetSupportAnalytics)
internal/http/server.go:186:84: protected.handleArchiveCampaign undefined (type *protectedStoreServer has no field or method handleArchiveCampaign)
internal/http/server.go:186:84: too many errors
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	0.012s
ok  	dsh-api/internal/analytics	0.010s
ok  	dsh-api/internal/auth	0.011s
ok  	dsh-api/internal/cart	0.006s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.006s
FAIL	dsh-api/internal/checkout [build failed]
ok  	dsh-api/internal/checkoutfinanceoutbox	0.005s
?   	dsh-api/internal/coupons	[no test files]
ok  	dsh-api/internal/dispatch	0.008s
ok  	dsh-api/internal/fieldcommissionoutbox	0.009s
ok  	dsh-api/internal/fieldreadiness	0.005s
ok  	dsh-api/internal/health	0.006s
ok  	dsh-api/internal/homediscovery	0.005s
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.006s
ok  	dsh-api/internal/media	0.024s
ok  	dsh-api/internal/notifications	0.009s
ok  	dsh-api/internal/operationaloutbox	0.010s
ok  	dsh-api/internal/orders	0.019s
ok  	dsh-api/internal/partner	0.005s
ok  	dsh-api/internal/partnerdelivery	0.006s
ok  	dsh-api/internal/partnerfleet	0.003s
ok  	dsh-api/internal/pickup	0.005s
ok  	dsh-api/internal/platformpolicies	0.003s
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.017s
ok  	dsh-api/internal/store	0.005s
ok  	dsh-api/internal/support	0.004s
ok  	dsh-api/internal/wlt	0.011s
ok  	dsh-api/internal/wltoutbox	0.004s
FAIL
```

## PowerShell parser
```text
```

## Verdict
**FAIL — inspect exact output above.**
