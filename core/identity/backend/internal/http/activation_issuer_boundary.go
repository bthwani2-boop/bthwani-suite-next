package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
)

const internalActivationBodyLimit = 32 * 1024

type activationIssuerPermission struct {
	Service string `json:"service"`
	Surface string `json:"surface"`
	Action  string `json:"action"`
	Scope   string `json:"scope"`
}

type activationActorAccess struct {
	OperatorContextID   string
	Active     bool
	Permissions []activationIssuerPermission
}

type actorAccessLookup interface {
	AccessForActor(ctx context.Context, actorID string) (activationActorAccess, error)
}

type sqlActorAccessLookup struct {
	db *sql.DB
}

func (l sqlActorAccessLookup) AccessForActor(ctx context.Context, actorID string) (activationActorAccess, error) {
	var access activationActorAccess
	var permissionsJSON []byte
	err := l.db.QueryRowContext(ctx, `
		SELECT operator_context_id, active, permissions
		FROM identity_actors
		WHERE id = $1`, actorID).Scan(&access.OperatorContextID, &access.Active, &permissionsJSON)
	if err != nil {
		return activationActorAccess{}, err
	}
	access.OperatorContextID = strings.TrimSpace(access.OperatorContextID)
	trimmed := bytes.TrimSpace(permissionsJSON)
	if len(trimmed) > 0 && string(trimmed) != "null" {
		if err := json.Unmarshal(trimmed, &access.Permissions); err != nil {
			return activationActorAccess{}, err
		}
	}
	return access, nil
}

func isInternalActivationIssuePath(path string) bool {
	if !strings.HasPrefix(path, "/internal/actors/") {
		return false
	}
	parts := strings.Split(strings.TrimPrefix(path, "/internal/actors/"), "/")
	return len(parts) == 2 && parts[0] != "" && parts[1] == "activations"
}

type activationIssuerRequest struct {
	IssuedByActorID   string `json:"issuedByActorId"`
	ExpectedActorType string `json:"expectedActorType"`
}

func readActivationIssuerBody(w http.ResponseWriter, r *http.Request) (activationIssuerRequest, bool) {
	body, err := io.ReadAll(io.LimitReader(r.Body, internalActivationBodyLimit+1))
	if err != nil || len(body) > internalActivationBodyLimit {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return activationIssuerRequest{}, false
	}
	r.Body = io.NopCloser(bytes.NewReader(body))
	r.ContentLength = int64(len(body))

	var request activationIssuerRequest
	if err := json.Unmarshal(body, &request); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return activationIssuerRequest{}, false
	}
	request.IssuedByActorID = strings.TrimSpace(request.IssuedByActorID)
	request.ExpectedActorType = strings.TrimSpace(request.ExpectedActorType)
	if request.IssuedByActorID == "" || request.ExpectedActorType == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "issuedByActorId and expectedActorType are required")
		return activationIssuerRequest{}, false
	}
	return request, true
}

func requiredActivationIssueAction(actorType string) (string, bool) {
	switch strings.TrimSpace(actorType) {
	case "employee":
		return "employee.activation:issue", true
	case "partner", "field", "captain":
		return "provider.activation:issue", true
	default:
		return "", false
	}
}

func hasActivationIssuePermission(access activationActorAccess, requiredAction string) bool {
	for _, permission := range access.Permissions {
		if strings.TrimSpace(permission.Service) == "workforce" &&
			strings.TrimSpace(permission.Surface) == "control-panel" &&
			strings.TrimSpace(permission.Action) == requiredAction &&
			strings.TrimSpace(permission.Scope) != "" {
			return true
		}
	}
	return false
}

func lookupActivationActor(
	w http.ResponseWriter,
	r *http.Request,
	lookup actorAccessLookup,
	actorID string,
) (activationActorAccess, bool) {
	access, err := lookup.AccessForActor(r.Context(), actorID)
	if errors.Is(err, sql.ErrNoRows) {
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
		return activationActorAccess{}, false
	}
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return activationActorAccess{}, false
	}
	return access, true
}

// activationIssuerBoundary establishes the real human actor represented by
// Workforce before Identity records or executes an activation issuance. The
// service credential proves only the calling service; it never authorizes an
// arbitrary issuedByActorId. The issuer must be active, hold Identity-owned
// activation permission, and share the target actor's trusted OperatorContext.
func activationIssuerBoundary(lookup actorAccessLookup, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || !isInternalActivationIssuePath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		request, ok := readActivationIssuerBody(w, r)
		if !ok {
			return
		}
		targetActorID := actorIDFromInternalPath(r.URL.Path)
		if targetActorID == "" {
			sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "activation target actor is required")
			return
		}
		if request.IssuedByActorID == targetActorID {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "an actor cannot issue its own activation")
			return
		}

		issuerAccess, ok := lookupActivationActor(w, r, lookup, request.IssuedByActorID)
		if !ok {
			return
		}
		targetAccess, ok := lookupActivationActor(w, r, lookup, targetActorID)
		if !ok {
			return
		}
		if !issuerAccess.Active {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "issuing actor is not active")
			return
		}
		if issuerAccess.OperatorContextID == "" || targetAccess.OperatorContextID == "" {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "issuer and target require trusted OperatorContext context")
			return
		}
		if issuerAccess.OperatorContextID != targetAccess.OperatorContextID {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "issuing actor and target belong to different OperatorContexts")
			return
		}

		runtimeOperatorContextID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))
		if runtimeOperatorContextID != "" && issuerAccess.OperatorContextID != runtimeOperatorContextID {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "issuing actor does not belong to the active runtime OperatorContext")
			return
		}

		requiredAction, validActorType := requiredActivationIssueAction(request.ExpectedActorType)
		if !validActorType {
			sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "expectedActorType is not activatable")
			return
		}
		if !hasActivationIssuePermission(issuerAccess, requiredAction) {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "issuing actor lacks activation permission")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ActivationIssuerBoundary validates the human issuer and OperatorContext boundary
// for actor-bound activation issuance in every runtime mode.
func ActivationIssuerBoundary(db *sql.DB, next http.Handler) http.Handler {
	return activationIssuerBoundary(sqlActorAccessLookup{db: db}, next)
}
