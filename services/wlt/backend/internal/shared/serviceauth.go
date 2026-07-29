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
	requestOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))

	if mode == "active" && activation != "authorized" && activation != "active" {
		SendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", "active SaaS mode requires authorized or active commercial state")
		return false
	}
	if requestOperatorContextID == "" {
		SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Operator-Context-ID is required for every WLT financial request")
		return false
	}
	return true
}

// RequireServiceCaller validates the shared-secret bearer token and expected
// service identity before accepting X-Operator-Context-ID as a service-to-service tenant
// context. Every WLT financial request fails closed when the authenticated
// caller omits its tenant; no process-wide, local, or legacy fallback is used.
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
	if !requireTrustedSaaSTenant(w, r) {
		return false
	}
	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	*r = *r.WithContext(WithOperatorContext(r.Context(), operatorContextID))
	return true
}
