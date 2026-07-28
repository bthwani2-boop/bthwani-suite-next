package shared

import (
	"context"
	"fmt"
	"os"
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

// RequireTenantContext returns the authenticated request tenant. Deferred/local
// runtimes retain an explicit legacy scope, while active SaaS fails closed.
func RequireTenantContext(ctx context.Context) (string, error) {
	if tenantID, ok := TenantIDFromContext(ctx); ok {
		return tenantID, nil
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")), "active") {
		return "", fmt.Errorf("trusted tenant context is required")
	}
	return "legacy-unscoped", nil
}
