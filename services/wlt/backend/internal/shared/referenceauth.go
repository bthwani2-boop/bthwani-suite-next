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
	OperatorContextID  string `json:"operatorContextId"`
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
	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	return operatorContextID, operatorContextID != ""
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

// RequireReferenceReader protects WLT reference projections in every runtime
// mode. Authenticated DSH requests carry their server-owned OperatorContext. End-user
// requests derive the OperatorContext from Identity; a client-supplied conflicting
// OperatorContext is rejected. Development and deferred modes never bypass this boundary.
func RequireReferenceReader(w http.ResponseWriter, r *http.Request) bool {
	if operatorContextID, ok := trustedDshReferenceRequest(r); ok {
		r.Header.Set("X-Operator-Context-ID", operatorContextID)
		*r = *r.WithContext(WithOperatorContext(r.Context(), operatorContextID))
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
	identityOperatorContextID := strings.TrimSpace(identity.OperatorContextID)
	if identityOperatorContextID == "" {
		SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "identity session has no trusted OperatorContext context")
		return false
	}
	requestOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	if requestOperatorContextID != "" && requestOperatorContextID != identityOperatorContextID {
		SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "client OperatorContext does not match the authenticated identity")
		return false
	}
	r.Header.Set("X-Operator-Context-ID", identityOperatorContextID)
	*r = *r.WithContext(WithOperatorContext(r.Context(), identityOperatorContextID))
	return true
}
