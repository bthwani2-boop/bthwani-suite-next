package wallet

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeRepresentativeActorType(t *testing.T) {
	for _, actorType := range []string{"client", "partner", "captain", "field"} {
		normalized, ok := normalizeRepresentativeActorType(strings.ToUpper(actorType))
		if !ok || normalized != actorType {
			t.Fatalf("expected %q to normalize to %q, got %q, ok=%v", strings.ToUpper(actorType), actorType, normalized, ok)
		}
	}
	if _, ok := normalizeRepresentativeActorType("operator"); ok {
		t.Fatal("operator must not be accepted as a representative wallet actor type")
	}
}

func TestHandleGetWalletRejectsMissingTenantBeforeDatabaseAccess(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wlt/wallets/client/client-1", nil)
	req.SetPathValue("actorType", "client")
	req.SetPathValue("actorId", "client-1")
	rec := httptest.NewRecorder()

	HandleGetWallet(nil)(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "TENANT_REQUIRED") {
		t.Fatalf("expected tenant-required error, got %s", rec.Body.String())
	}
}

func TestHandleGetWalletRejectsUnsupportedActorBeforeDatabaseAccess(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wlt/wallets/operator/op-1", nil)
	req.Header.Set("X-Tenant-ID", "tenant-a")
	req.SetPathValue("actorType", "operator")
	req.SetPathValue("actorId", "op-1")
	rec := httptest.NewRecorder()

	HandleGetWallet(nil)(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "UNSUPPORTED_ACTOR_TYPE") {
		t.Fatalf("expected unsupported actor error, got %s", rec.Body.String())
	}
}

func TestHandleGetWalletRejectsOversizedActorIDBeforeDatabaseAccess(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wlt/wallets/client/value", nil)
	req.Header.Set("X-Tenant-ID", "tenant-a")
	req.SetPathValue("actorType", "client")
	req.SetPathValue("actorId", strings.Repeat("x", 201))
	rec := httptest.NewRecorder()

	HandleGetWallet(nil)(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "INVALID_ACTOR_ID") {
		t.Fatalf("expected invalid actor id error, got %s", rec.Body.String())
	}
}
