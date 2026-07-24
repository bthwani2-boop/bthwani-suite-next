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

func activeReferenceTenant() (string, bool) {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")), "active") {
		return "", false
	}
	return strings.TrimSpace(os.Getenv("BTHWANI_DEFAULT_TENANT_ID")), true
}

func trustedDshReferenceRequest(r *http.Request, tenantID string) bool {
	expectedToken := strings.TrimSpace(os.Getenv("WLT_DSH_SERVICE_TOKEN"))
	if expectedToken == "" || r.Header.Get("X-Service-Caller") != "dsh" {
		return false
	}
	if subtle.ConstantTimeCompare(
		[]byte(strings.TrimSpace(r.Header.Get("Authorization"))),
		[]byte("Bearer "+expectedToken),
	) != 1 {
		return false
	}
	return subtle.ConstantTimeCompare(
		[]byte(strings.TrimSpace(r.Header.Get("X-Tenant-ID"))),
		[]byte(tenantID),
	) == 1
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

// RequireReferenceReader protects formerly public WLT projections in active
// SaaS mode. A trusted DSH service request may use service authentication and a
// server-owned tenant header. End-user callers must present an Identity bearer
// session whose tenant matches the runtime tenant; their X-Tenant-ID header is
// ignored as an ownership signal.
func RequireReferenceReader(w http.ResponseWriter, r *http.Request) bool {
	tenantID, active := activeReferenceTenant()
	if !active {
		return true
	}
	if tenantID == "" {
		SendError(w, http.StatusServiceUnavailable, "SAAS_TENANT_NOT_CONFIGURED", "BTHWANI_DEFAULT_TENANT_ID is required in active SaaS mode")
		return false
	}
	if trustedDshReferenceRequest(r, tenantID) {
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
	if strings.TrimSpace(identity.TenantID) != tenantID {
		SendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "identity belongs to another tenant")
		return false
	}
	return true
}
