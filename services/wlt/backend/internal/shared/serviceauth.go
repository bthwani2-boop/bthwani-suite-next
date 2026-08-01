package shared

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

const legacyOperatorContextHeader = "X-Operator-Context-ID"

// configuredFinancialCompatibilityScope returns the single, server-owned
// operator context that identifies this WLT deployment for the DSH service
// bridge. WLT is a single-tenant financial service by design: every request
// that arrives through the DSH service-to-service path is bound to this one
// fixed value, never to a caller-supplied header. The operator_context_id
// column that appears throughout the schema is retained (it is load-bearing
// for the per-row scoping guards and their tests -- see
// internal/*/operator_context_isolation_test.go), but it identifies rows
// within this single deployment, not separate tenants reachable over the
// network. Do not read this as an active multi-tenant boundary.
func configuredFinancialCompatibilityScope(w http.ResponseWriter) (string, bool) {
	scopeID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))
	if scopeID == "" {
		SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_CONFIGURED", "BTHWANI_OPERATOR_CONTEXT_ID must be configured; WLT is single-tenant per deployment")
		return "", false
	}
	return scopeID, true
}

// RequireServiceCaller validates the shared-secret bearer token and expected
// service identity. After authentication, WLT replaces any caller-supplied
// X-Operator-Context-ID with the single deployment-owned operator context
// (see configuredFinancialCompatibilityScope). Callers cannot select
// financial ownership or isolation scope; WLT does not implement multi-tenant
// isolation across the DSH service bridge.
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
