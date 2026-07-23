package partner

import (
	"net/http/httptest"
	"testing"
)

func TestActorFromContextIgnoresSpoofableHeaders(t *testing.T) {
	req := httptest.NewRequest("POST", "/dsh/operator/partners/prt_001/transition", nil)
	req.Header.Set("X-Actor-ID", "spoofed-operator")
	req.Header.Set("X-Actor-Surface", "control-panel")

	actorID, surface := actorFromContext(req)
	if actorID != "" || surface != "" {
		t.Fatalf("actorFromContext must ignore client-controlled headers, got actorID=%q surface=%q", actorID, surface)
	}
}

func TestStoreIDFromContextIgnoresSpoofableHeader(t *testing.T) {
	req := httptest.NewRequest("GET", "/dsh/partner/activation/status", nil)
	req.Header.Set("X-Store-ID", "spoofed-store")

	if got := storeIDFromContext(req); got != "" {
		t.Fatalf("storeIDFromContext must ignore client-controlled headers, got %q", got)
	}
}

func TestTenantIDFromContextIgnoresSpoofableHeadersAndQuery(t *testing.T) {
	req := httptest.NewRequest("GET", "/dsh/operator/partners?tenantId=spoofed-query", nil)
	req.Header.Set("X-Tenant-ID", "spoofed-header")
	req.Header.Set("X-Organization-ID", "spoofed-organization")

	if tenantID, ok := TenantIDFromContext(req.Context()); ok || tenantID != "" {
		t.Fatalf("TenantIDFromContext must ignore client-controlled tenant selectors, got tenantID=%q ok=%v", tenantID, ok)
	}
}
