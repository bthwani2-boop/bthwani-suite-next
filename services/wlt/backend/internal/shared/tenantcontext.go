package shared

import (
	"context"
	"fmt"
	"strings"
)

type tenantContextKey struct{}

func WithTenantContext(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantContextKey{}, strings.TrimSpace(tenantID))
}

func TenantIDFromContext(ctx context.Context) (string, bool) {
	tenantID, _ := ctx.Value(tenantContextKey{}).(string)
	tenantID = strings.TrimSpace(tenantID)
	return tenantID, tenantID != ""
}

// RequireTenantContext returns the trusted request tenant and fails closed when
// no authenticated tenant was propagated. Financial code must never invent a
// process-wide, local, or legacy tenant ownership fallback.
func RequireTenantContext(ctx context.Context) (string, error) {
	if tenantID, ok := TenantIDFromContext(ctx); ok {
		return tenantID, nil
	}
	return "", fmt.Errorf("trusted tenant context is required")
}
