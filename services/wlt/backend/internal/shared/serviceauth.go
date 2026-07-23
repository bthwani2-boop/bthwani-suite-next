package shared

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

func requireTrustedSaaSTenant(w http.ResponseWriter, r *http.Request) bool {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")))
	activation := strings.ToLower(strings.TrimSpace(os.Getenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE")))
	requestTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))

	if mode != "active" {
		if strings.HasPrefix(r.URL.Path, "/wlt/promotion-funding/") && requestTenantID == "" {
			SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required for promotion funding")
			return false
		}
		return true
	}
	if activation != "authorized" && activation != "active" {
		SendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", "active SaaS mode requires authorized or active commercial state")
		return false
	}

	defaultTenantID := strings.TrimSpace(os.Getenv("BTHWANI_DEFAULT_TENANT_ID"))
	if defaultTenantID == "" {
		SendError(w, http.StatusServiceUnavailable, "SAAS_TENANT_NOT_CONFIGURED", "BTHWANI_DEFAULT_TENANT_ID is required in active SaaS mode")
		return false
	}
	if requestTenantID == "" {
		SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required in active SaaS mode")
		return false
	}
	if subtle.ConstantTimeCompare([]byte(requestTenantID), []byte(defaultTenantID)) != 1 {
		SendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "service tenant does not match the active runtime tenant")
		return false
	}
	return true
}

// RequireServiceCaller enforces that a request carries a valid shared-secret
// bearer token (compared in constant time), the expected X-Service-Caller and,
// when SaaS runtime mode is active, a trusted X-Tenant-ID matching the runtime
// tenant. The tenant header is accepted only after service authentication and
// is never trusted as a browser-supplied ownership selector.
func RequireServiceCaller(w http.ResponseWriter, r *http.Request, tokenEnvVar, expectedCaller string) bool {
	expectedToken := os.Getenv(tokenEnvVar)
	if expectedToken == "" {
		SendError(w, http.StatusServiceUnavailable, "SERVICE_AUTH_NOT_CONFIGURED", tokenEnvVar+" is not configured")
		return false
	}
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		SendError(w, http.StatusUnauthorized, "SERVICE_AUTH_REQUIRED", "service authorization is required")
		return false
	}
	if subtle.ConstantTimeCompare([]byte(authHeader), []byte("Bearer "+expectedToken)) != 1 {
		SendError(w, http.StatusForbidden, "SERVICE_TOKEN_INVALID", "service authorization token is invalid")
		return false
	}
	if r.Header.Get("X-Service-Caller") != expectedCaller {
		SendError(w, http.StatusForbidden, "SERVICE_CALLER_FORBIDDEN", "unexpected service caller")
		return false
	}
	return requireTrustedSAASTenant(w, r)
}
