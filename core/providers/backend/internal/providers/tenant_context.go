package providers

import (
	"context"
	"errors"
	"strings"
)

type tenantContextKey struct{}

var ErrTenantContextRequired = errors.New("trusted tenant context is required")

// WithTenantContext installs the tenant resolved from the authenticated Identity
// session. Callers must never populate this value from request headers or body.
func WithTenantContext(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantContextKey{}, strings.TrimSpace(tenantID))
}

func TenantIDFromContext(ctx context.Context) (string, bool) {
	tenantID, _ := ctx.Value(tenantContextKey{}).(string)
	tenantID = strings.TrimSpace(tenantID)
	return tenantID, tenantID != ""
}

func RequireTenantContext(ctx context.Context) (string, error) {
	if tenantID, ok := TenantIDFromContext(ctx); ok {
		return tenantID, nil
	}
	return "", ErrTenantContextRequired
}
