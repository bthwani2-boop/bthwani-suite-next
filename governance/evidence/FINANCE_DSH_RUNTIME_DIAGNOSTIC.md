# Finance DSH Runtime Diagnostic

- Source SHA: `7571229a365561e826840e61d94e393b66e9c971`
- DSH exit: `1`
- PowerShell parser exit: `0`

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
# dsh-api/internal/http
internal/http/actor_finance_handlers.go:23:99: undefined: auth.Actor
internal/http/actor_finance_handlers.go:111:101: undefined: auth.Actor
internal/http/server.go:166:62: protected.handleListClientSupportTickets undefined (type *protectedStoreServer has no field or method handleListClientSupportTickets)
internal/http/server.go:167:73: protected.handleGetClientSupportTicket undefined (type *protectedStoreServer has no field or method handleGetClientSupportTicket)
internal/http/server.go:168:83: protected.handleAddClientSupportMessage undefined (type *protectedStoreServer has no field or method handleAddClientSupportMessage)
internal/http/server.go:169:64: protected.handleListOperatorSupportTickets undefined (type *protectedStoreServer has no field or method handleListOperatorSupportTickets)
internal/http/server.go:170:75: protected.handleGetOperatorSupportTicket undefined (type *protectedStoreServer has no field or method handleGetOperatorSupportTicket)
internal/http/server.go:171:77: protected.handleUpdateOperatorSupportTicket undefined (type *protectedStoreServer has no field or method handleUpdateOperatorSupportTicket)
internal/http/server.go:172:85: protected.handleAddOperatorSupportMessage undefined (type *protectedStoreServer has no field or method handleAddOperatorSupportMessage)
internal/http/server.go:173:85: protected.handleEscalateSupportTicket undefined (type *protectedStoreServer has no field or method handleEscalateSupportTicket)
internal/http/server.go:173:85: too many errors
FAIL	dsh-api/cmd/dsh-api [build failed]
ok  	dsh-api/internal/administration	0.008s
ok  	dsh-api/internal/analytics	0.003s
ok  	dsh-api/internal/auth	0.007s
ok  	dsh-api/internal/cart	0.004s
?   	dsh-api/internal/catalogapproval	[no test files]
ok  	dsh-api/internal/centralcatalog	0.006s
ok  	dsh-api/internal/checkout	0.004s
ok  	dsh-api/internal/checkoutfinanceoutbox	0.004s
?   	dsh-api/internal/coupons	[no test files]
ok  	dsh-api/internal/dispatch	0.004s
ok  	dsh-api/internal/fieldcommissionoutbox	0.005s
ok  	dsh-api/internal/fieldreadiness	0.004s
ok  	dsh-api/internal/health	0.025s
ok  	dsh-api/internal/homediscovery	0.004s
FAIL	dsh-api/internal/http [build failed]
ok  	dsh-api/internal/marketing	0.008s
ok  	dsh-api/internal/media	0.016s
ok  	dsh-api/internal/notifications	0.008s
ok  	dsh-api/internal/operationaloutbox	0.005s
ok  	dsh-api/internal/orders	0.007s
ok  	dsh-api/internal/partner	0.016s
ok  	dsh-api/internal/partnerdelivery	0.013s
ok  	dsh-api/internal/partnerfleet	0.009s
ok  	dsh-api/internal/pickup	0.006s
ok  	dsh-api/internal/platformpolicies	0.003s
?   	dsh-api/internal/promotionfundingoutbox	[no test files]
ok  	dsh-api/internal/specialrequests	0.005s
ok  	dsh-api/internal/store	0.006s
ok  	dsh-api/internal/support	0.004s
ok  	dsh-api/internal/wlt	0.011s
ok  	dsh-api/internal/wltoutbox	0.004s
FAIL
```

## PowerShell parser
```text
```
