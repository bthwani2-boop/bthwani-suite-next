package shared

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

const legacyOperatorContextHeader = "X-Operator-Context-ID"

// configuredFinancialCompatibilityScope returns the server-owned compatibility
// value required by the current WLT schema while operator_context_id is removed
// from the financial domain model. It is configuration, not caller-selected
// ownership and not an active tenant boundary.
func configuredFinancialCompatibilityScope(w http.ResponseWriter) (string, bool) {
	scopeID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))
	if scopeID == "" {
		SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_CONFIGURED", "BTHWANI_OPERATOR_CONTEXT_ID is required while the legacy WLT scope columns are being retired")
		return "", false
	}
	return scopeID, true
}

// RequireServiceCaller validates the shared-secret bearer token and expected
// service identity. After authentication, WLT replaces any caller-supplied
// X-Operator-Context-ID with the server-owned compatibility value. Callers
// cannot select financial ownership or isolation scope.
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

	scopeID, ok := configuredFinancialCompatibilityScope(w)
	if !ok {
		return false
	}
	r.Header.Set(legacyOperatorContextHeader, scopeID)
	*r = *r.WithContext(WithOperatorContext(r.Context(), scopeID))
	return true
}
