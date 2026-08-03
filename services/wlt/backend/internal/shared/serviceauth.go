package shared

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

const legacyOperatorContextHeader = "X-Operator-Context-ID"

// RequireServiceCaller validates the shared-secret bearer token and expected
// service identity before accepting the delegated OperatorContext. The context
// header is trusted only on this authenticated server-to-server path; browser
// and end-user requests must derive it from Identity instead.
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

	operatorContextID := strings.TrimSpace(r.Header.Get(legacyOperatorContextHeader))
	if operatorContextID == "" {
		SendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "authenticated service delegation requires X-Operator-Context-ID")
		return false
	}
	r.Header.Set(legacyOperatorContextHeader, operatorContextID)
	*r = *r.WithContext(WithOperatorContext(r.Context(), operatorContextID))
	return true
}
