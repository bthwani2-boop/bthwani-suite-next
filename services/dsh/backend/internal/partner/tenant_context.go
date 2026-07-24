package partner

import (
	"context"
	"errors"
	"strings"
)

var ErrTenantContextRequired = errors.New("trusted tenant context is required")

type tenantContextKey struct{}

// WithTenantContext attaches the tenant resolved from the authenticated Identity
// session. Callers must never populate this value from query parameters or
// client-controlled tenant headers.
func WithTenantContext(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantContextKey{}, strings.TrimSpace(tenantID))
}

// TenantIDFromContext returns only the trusted tenant value installed by the
// DSH HTTP authentication boundary.
func TenantIDFromContext(ctx context.Context) (string, bool) {
	tenantID, _ := ctx.Value(tenantContextKey{}).(string)
	tenantID = strings.TrimSpace(tenantID)
	return tenantID, tenantID != ""
}
