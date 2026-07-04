package shared

import (
	"crypto/subtle"
	"net/http"
	"os"
)

// RequireServiceCaller enforces that a request carries a valid shared-secret
// bearer token (compared in constant time) plus the expected X-Service-Caller
// identity. The secret is read from the given environment variable on every
// call so it can be rotated without a restart in most deployments.
//
// Missing Authorization -> 401. Wrong token or wrong caller -> 403. If the
// environment variable itself is unset, the request is rejected as
// unavailable (503) rather than silently allowed, so a misconfigured
// deployment fails closed instead of open.
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
	return true
}
