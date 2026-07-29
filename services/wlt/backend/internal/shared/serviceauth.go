package shared

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

func requireTrustedOperatorContext(w http.ResponseWriter, r *http.Request) bool {
	requestOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))

	if requestOperatorContextID == "" {
		SendError(w, http.StatusBadRequest, "MISSING_operator_context_id", "X-Operator-Context-ID is required for every WLT financial request")
		return false
	}
	return true
}

// RequireServiceCaller validates the shared-secret bearer token and expected
// service identity before accepting X-Operator-Context-ID as a service-to-service OperatorContext
// context. Every WLT financial request fails closed when the authenticated
// caller omits its OperatorContext; no process-wide, local, or legacy fallback is used.
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
	if !requireTrustedOperatorContext(w, r) {
		return false
	}
	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	*r = *r.WithContext(WithOperatorContext(r.Context(), operatorContextID))
	return true
}
