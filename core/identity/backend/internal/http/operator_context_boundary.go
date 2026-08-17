package http

import (
	"bytes"
	"context"
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
)

type provisionActorOperatorRequest struct {
	Username          string `json:"username"`
	PhoneE164         string `json:"phoneE164"`
	Role              string `json:"role"`
	OperatorContextID string `json:"operatorContextId"`
}

type trustedOperatorContextKey struct{}

func withTrustedOperatorContext(r *http.Request, operatorContextID string) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), trustedOperatorContextKey{}, operatorContextID))
}

func trustedOperatorContext(r *http.Request) (string, bool) {
	value, ok := r.Context().Value(trustedOperatorContextKey{}).(string)
	value = strings.TrimSpace(value)
	return value, ok && value != ""
}

func validateInternalOperatorRequest(w http.ResponseWriter, r *http.Request) (string, bool) {
	if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "workforce" {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
		return "", false
	}
	expectedToken := strings.TrimSpace(os.Getenv("IDENTITY_WORKFORCE_SERVICE_TOKEN"))
	if expectedToken == "" {
		sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "internal API is not configured")
		return "", false
	}
	token, ok := bearerToken(r)
	if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "service token is required")
		return "", false
	}
	requestedOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	if requestedOperatorContextID == "" {
		sendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "X-Operator-Context-ID is required for internal actor operations")
		return "", false
	}
	return requestedOperatorContextID, true
}

func rewriteProvisionOperatorContext(w http.ResponseWriter, r *http.Request, operatorContextID string) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	var input provisionActorOperatorRequest
	if err := decoder.Decode(&input); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	requestedOperatorContextID := strings.TrimSpace(input.OperatorContextID)
	if requestedOperatorContextID != "" && requestedOperatorContextID != operatorContextID {
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "provisioned actor context cannot override the active runtime context")
		return false
	}
	input.OperatorContextID = operatorContextID
	body, err := json.Marshal(input)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return false
	}
	r.Body = ioNopCloser(bytes.NewReader(body))
	r.ContentLength = int64(len(body))
	r.Header.Set("Content-Type", "application/json")
	return true
}

func ioNopCloser(reader *bytes.Reader) httpBodyReadCloser {
	return httpBodyReadCloser{Reader: reader}
}

type httpBodyReadCloser struct{ *bytes.Reader }

func (httpBodyReadCloser) Close() error { return nil }

func actorIDFromInternalPath(path string) string {
	rest := strings.TrimPrefix(path, "/internal/actors/")
	if rest == path || rest == "" {
		return ""
	}
	actorID, _, _ := strings.Cut(rest, "/")
	if actorID == "search" || actorID == "provision" {
		return ""
	}
	return actorID
}

func isDirectActorRead(r *http.Request, actorID string) bool {
	return r.Method == http.MethodGet && r.URL.Path == "/internal/actors/"+actorID
}

func actorBelongsToOperatorContext(w http.ResponseWriter, r *http.Request, db *sql.DB, actorID, operatorContextID string) bool {
	var actorOperatorContextID string
	err := db.QueryRowContext(r.Context(), `
		SELECT operator_context_id FROM identity_actors WHERE id = $1`, actorID).Scan(&actorOperatorContextID)
	if errors.Is(err, sql.ErrNoRows) {
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
		return false
	}
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return false
	}
	if strings.TrimSpace(actorOperatorContextID) != operatorContextID {
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
		return false
	}
	return true
}

// OperatorBoundary authenticates the Workforce service once, derives one
// trusted operator context, and passes that context to the canonical repository
// search/read path. Mutations retain an early object-scope check as defense in
// depth; direct reads are scoped atomically by their repository query.
func OperatorBoundary(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/internal/actors") {
			next.ServeHTTP(w, r)
			return
		}
		operatorContextID, ok := validateInternalOperatorRequest(w, r)
		if !ok {
			return
		}
		r = withTrustedOperatorContext(r, operatorContextID)
		if r.Method == http.MethodPost && r.URL.Path == "/internal/actors/provision" {
			if !rewriteProvisionOperatorContext(w, r, operatorContextID) {
				return
			}
		}
		if actorID := actorIDFromInternalPath(r.URL.Path); actorID != "" && !isDirectActorRead(r, actorID) {
			if !actorBelongsToOperatorContext(w, r, db, actorID, operatorContextID) {
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
