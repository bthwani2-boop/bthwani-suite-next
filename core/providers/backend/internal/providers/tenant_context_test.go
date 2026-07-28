package providers

import (
	"context"
	"errors"
	"testing"
)

func TestRequireTenantContextFailsClosed(t *testing.T) {
	tenantID, err := RequireTenantContext(context.Background())
	if !errors.Is(err, ErrTenantContextRequired) || tenantID != "" {
		t.Fatalf("missing tenant returned tenant=%q err=%v", tenantID, err)
	}
}

func TestRequireTenantContextReturnsAuthenticatedTenant(t *testing.T) {
	ctx := WithTenantContext(context.Background(), "  tenant-a  ")
	tenantID, err := RequireTenantContext(ctx)
	if err != nil || tenantID != "tenant-a" {
		t.Fatalf("trusted tenant returned tenant=%q err=%v", tenantID, err)
	}
}

func TestEmptyTenantCannotBecomeContextAuthority(t *testing.T) {
	ctx := WithTenantContext(context.Background(), "  ")
	if tenantID, ok := TenantIDFromContext(ctx); ok || tenantID != "" {
		t.Fatalf("empty tenant became authoritative tenant=%q ok=%v", tenantID, ok)
	}
}
