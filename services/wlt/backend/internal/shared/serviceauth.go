package shared

import (
	"context"
	"crypto/subtle"
	"fmt"
	"net/http"
	"os"
	"strings"
)

const DelegatedOperatorContextHeader = "X-Delegated-Operator-Context"

const DelegatedFinancePrincipalHeader = "X-Delegated-Principal-ID"

type delegatedFinancePrincipalContextKey struct{}

// WithDelegatedFinancePrincipal records an Identity-authenticated operator
// delegated by an already authenticated internal service.
func WithDelegatedFinancePrincipal(ctx context.Context, principalID string) context.Context {
	return context.WithValue(ctx, delegatedFinancePrincipalContextKey{}, principalID)
}

// DelegatedFinancePrincipalFromContext returns the operator identity that was
// authenticated by DSH and bound to this service-authenticated request.
func DelegatedFinancePrincipalFromContext(ctx context.Context) (string, bool) {
	principalID, ok := ctx.Value(delegatedFinancePrincipalContextKey{}).(string)
	principalID = strings.TrimSpace(principalID)
	return principalID, ok && principalID != ""
}

// RequireDelegatedFinancePrincipal is the fail-closed domain boundary for
// sensitive finance actions. Callers must never substitute a body field for
// the Identity-authenticated principal bound by RequireServiceCaller.
func RequireDelegatedFinancePrincipal(ctx context.Context) (string, error) {
	principalID, ok := DelegatedFinancePrincipalFromContext(ctx)
	if !ok {
		return "", fmt.Errorf("Identity-authenticated delegated finance principal is required")
	}
	return principalID, nil
}

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

	operatorContextID := strings.TrimSpace(r.Header.Get(DelegatedOperatorContextHeader))
	if operatorContextID == "" {
		SendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "authenticated service delegation requires X-Delegated-Operator-Context")
		return false
	}
	ctx := WithOperatorContext(r.Context(), operatorContextID)
	if principalID := strings.TrimSpace(r.Header.Get(DelegatedFinancePrincipalHeader)); principalID != "" {
		r.Header.Set(DelegatedFinancePrincipalHeader, principalID)
		ctx = WithDelegatedFinancePrincipal(ctx, principalID)
	}
	*r = *r.WithContext(ctx)
	return true
}
