package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

const internalActivationBodyLimit = 32 * 1024

type actorTenantLookup interface {
	TenantForActor(ctx context.Context, actorID string) (string, error)
}

type sqlActorTenantLookup struct {
	db *sql.DB
}

func (l sqlActorTenantLookup) TenantForActor(ctx context.Context, actorID string) (string, error) {
	var tenantID string
	err := l.db.QueryRowContext(ctx, `
		SELECT tenant_id FROM identity_actors WHERE id = $1`, actorID).Scan(&tenantID)
	return strings.TrimSpace(tenantID), err
}

func isInternalActivationIssuePath(path string) bool {
	if !strings.HasPrefix(path, "/internal/actors/") {
		return false
	}
	parts := strings.Split(strings.TrimPrefix(path, "/internal/actors/"), "/")
	return len(parts) == 2 && parts[0] != "" && parts[1] == "activations"
}

func readActivationIssuerBody(w http.ResponseWriter, r *http.Request) (string, bool) {
	body, err := io.ReadAll(io.LimitReader(r.Body, internalActivationBodyLimit+1))
	if err != nil || len(body) > internalActivationBodyLimit {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return "", false
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	r.ContentLength = int64(len(body))

	var request struct {
		IssuedByActorID string `json:"issuedByActorId"`
	}
	if err := json.Unmarshal(body, &request); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return "", false
	}
	issuerActorID := strings.TrimSpace(request.IssuedByActorID)
	if issuerActorID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "issuedByActorId is required")
		return "", false
	}
	return issuerActorID, true
}

func saasActivationIssuerBoundary(lookup actorTenantLookup, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || !isInternalActivationIssuePath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		tenantID, active, err := activeSaaSTenant()
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", err.Error())
			return
		}
		if !active {
			next.ServeHTTP(w, r)
			return
		}
		issuerActorID, ok := readActivationIssuerBody(w, r)
		if !ok {
			return
		}
		issuerTenantID, err := lookup.TenantForActor(r.Context(), issuerActorID)
		if errors.Is(err, sql.ErrNoRows) {
			sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "issuing actor was not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
			return
		}
		if issuerTenantID != tenantID {
			sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "issuing actor belongs to another tenant")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// SaaSActivationIssuerBoundary ensures both the target actor (validated by the
// outer SaaSTenantBoundary) and the operator issuing the activation belong to
// the same trusted runtime tenant.
func SaaSActivationIssuerBoundary(db *sql.DB, next http.Handler) http.Handler {
	return saasActivationIssuerBoundary(sqlActorTenantLookup{db: db}, next)
}
