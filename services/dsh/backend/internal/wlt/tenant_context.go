package wlt

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

type tenantContextKey struct{}

// WithTenantContext attaches a tenant that was resolved by a trusted server-side
// boundary (Identity session, database-owned outbox row, or another authenticated
// service). Browser headers and request payloads must never populate this value.
func WithTenantContext(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantContextKey{}, strings.TrimSpace(tenantID))
}

// TenantIDFromContext returns only the trusted tenant installed by a server-side
// boundary. An empty value is intentionally treated as missing context.
func TenantIDFromContext(ctx context.Context) (string, bool) {
	tenantID, _ := ctx.Value(tenantContextKey{}).(string)
	tenantID = strings.TrimSpace(tenantID)
	return tenantID, tenantID != ""
}

type tenantRoundTripper struct {
	base http.RoundTripper
}

func (transport tenantRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	base := transport.base
	if base == nil {
		base = http.DefaultTransport
	}

	trustedTenantID, hasTrustedTenant := TenantIDFromContext(req.Context())
	if !hasTrustedTenant {
		return nil, fmt.Errorf("trusted tenant context is required for every WLT request")
	}
	headerTenantID := strings.TrimSpace(req.Header.Get("X-Tenant-ID"))
	if headerTenantID != "" && headerTenantID != trustedTenantID {
		return nil, fmt.Errorf("WLT tenant header does not match trusted request context")
	}
	if headerTenantID != trustedTenantID {
		clone := req.Clone(req.Context())
		clone.Header = req.Header.Clone()
		clone.Header.Set("X-Tenant-ID", trustedTenantID)
		req = clone
	}
	return base.RoundTrip(req)
}
