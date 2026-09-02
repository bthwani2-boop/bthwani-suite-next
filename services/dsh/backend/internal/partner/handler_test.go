package partner

import (
	"dsh-api/internal/opctx"
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

	if got := partnerIDFromContext(req); got != "" {
		t.Fatalf("partnerIDFromContext must ignore client-controlled headers, got %q", got)
	}
}

func TestOperatorContextIDFromContextIgnoresSpoofableHeadersAndQuery(t *testing.T) {
	req := httptest.NewRequest("GET", "/dsh/operator/partners?operatorContextId=spoofed-query", nil)
	req.Header.Set("X-Operator-Context-ID", "spoofed-header")
	req.Header.Set("X-Organization-ID", "spoofed-organization")

	if operatorContextID, ok := opctx.OperatorContextIDFromContext(req.Context()); ok || operatorContextID != "" {
		t.Fatalf("OperatorContextIDFromContext must ignore client-controlled OperatorContext selectors, got operatorContextID=%q ok=%v", operatorContextID, ok)
	}
}
