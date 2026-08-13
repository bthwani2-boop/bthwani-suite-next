package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestValidateProviderDocumentMediaRequiresWorkforceServiceIdentity(t *testing.T) {
	t.Setenv("DSH_WORKFORCE_SERVICE_TOKEN", "dsh-token")
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/workforce/provider-media-refs/validate", strings.NewReader(`{"actorId":"field-1","actorRole":"field","mediaRef":"media-1"}`))
	req.Header.Set("Authorization", "Bearer wrong-token")
	req.Header.Set("X-Service-Caller", "workforce")
	recorder := httptest.NewRecorder()
	handleValidateProviderDocumentMedia(nil).ServeHTTP(recorder, req)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for invalid service token, got %d", recorder.Code)
	}
}

func TestValidateProviderDocumentMediaRejectsMalformedScopeBeforeDatabase(t *testing.T) {
	t.Setenv("DSH_WORKFORCE_SERVICE_TOKEN", "dsh-token")
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/workforce/provider-media-refs/validate", strings.NewReader(`{"actorId":"field-1","actorRole":"partner","mediaRef":"media-1"}`))
	req.Header.Set("Authorization", "Bearer dsh-token")
	req.Header.Set("X-Service-Caller", "workforce")
	recorder := httptest.NewRecorder()
	handleValidateProviderDocumentMedia(nil).ServeHTTP(recorder, req)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid provider role, got %d", recorder.Code)
	}
}

func TestProviderMediaRoleValidation(t *testing.T) {
	for _, role := range []string{"field", "captain", "employee"} {
		if !validProviderMediaRole(role) {
			t.Fatalf("expected provider role %q to be valid", role)
		}
	}
	if validProviderMediaRole("partner") {
		t.Fatal("partner must not be accepted as a provider media owner")
	}
}
