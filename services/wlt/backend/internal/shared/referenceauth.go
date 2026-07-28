package shared

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"
)

type referenceIdentity struct {
	Subject   string `json:"subject"`
	TenantID  string `json:"tenantId"`
	AuthState string `json:"authState"`
}

func trustedDshReferenceRequest(r *http.Request) (string, bool) {
	expectedToken := strings.TrimSpace(os.Getenv("WLT_DSH_SERVICE_TOKEN"))
	if expectedToken == "" || r.Header.Get("X-Service-Caller") != "dsh" {
		return "", false
	}
	if subtle.ConstantTimeCompare(
		[]byte(strings.TrimSpace(r.Header.Get("Authorization"))),
		[]byte("Bearer "+expectedToken),
	) != 1 {
		return "", false
	}
	tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	return tenantID, tenantID != ""
}

func resolveReferenceIdentity(ctx context.Context, authorization string) (referenceIdentity, error) {
	identityBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("IDENTITY_API_BASE_URL")), "/")
	if identityBaseURL == "" {
		return referenceIdentity{}, ErrReferenceIdentityUnavailable
	}
	if !strings.HasPrefix(strings.TrimSpace(authorization), "Bearer ") {
		return referenceIdentity{}, ErrReferenceUnauthenticated
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, identityBaseURL+"/auth/session", nil)
	if err != nil {
		return referenceIdentity{}, ErrReferenceIdentityUnavailable
	}
	req.Header.Set("Authorization", authorization)
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return referenceIdentity{}, ErrReferenceIdentityUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return referenceIdentity{}, ErrReferenceUnauthenticated
	}
	if resp.StatusCode != http.StatusOK {
		return referenceIdentity{}, ErrReferenceIdentityUnavailable
	}
	var identity referenceIdentity
	if err := json.NewDecoder(resp.Body).Decode(&identity); err != nil {
		return referenceIdentity{}, ErrReferenceIdentityUnavailable
	}
	if identity.Subject == "" || identity.AuthState != "authenticated" {
		return referenceIdentity{}, ErrReferenceUnauthenticated
	}
	return identity, nil
}

type referenceAuthError string

func (e referenceAuthError) Error() string { return string(e) }

const (
	ErrReferenceUnauthenticated     referenceAuthError = "reference unauthenticated"
	ErrReferenceIdentityUnavailable referenceAuthError = "reference identity unavailable"
)

// RequireReferenceReader protects WLT read projections in active SaaS mode.
// Authenticated DSH requests carry their server-owned tenant. End-user requests
// derive the tenant from Identity and overwrite any matching client header only
// after authentication; a conflicting client header is rejected.
func RequireReferenceReader(w http.ResponseWriter, r *http.Request) bool {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")), "active") {
		return true
	}
	if tenantID, ok := trustedDshReferenceRequest(r); ok {
		r.Header.Set("X-Tenant-ID", tenantID)
		*r = *r.WithContext(WithTenantContext(r.Context(), tenantID))
		return true
	}
	identity, err := resolveReferenceIdentity(r.Context(), r.Header.Get("Authorization"))
	if err == ErrReferenceIdentityUnavailable {
		SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return false
	}
	if err != nil {
		SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "identity session is required")
		return false
	}
	identityTenantID := strings.TrimSpace(identity.TenantID)
	if identityTenantID == "" {
		SendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", "identity session has no trusted tenant context")
		return false
	}
	requestTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	if requestTenantID != "" && requestTenantID != identityTenantID {
		SendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "client tenant does not match the authenticated identity")
		return false
	}
	r.Header.Set("X-Tenant-ID", identityTenantID)
	*r = *r.WithContext(WithTenantContext(r.Context(), identityTenantID))
	return true
}
