package http

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"os"
	"strings"

	"identity-api/internal/identity"
)

// RbacDefinitionBoundary exposes the complete Identity-owned role definition
// and permission vocabulary only to the authenticated DSH service boundary.
// Browser and sibling-service callers never receive a direct RBAC write path.
func RbacDefinitionBoundary(repository *identity.Repository, next http.Handler) http.Handler {
	authority := repository.PermissionAuthority()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /internal/rbac/permission-vocabulary", dshRbacServiceOnly(handlePermissionVocabulary(authority)))
	mux.HandleFunc("GET /internal/rbac/role-definitions/{roleName}", dshRbacServiceOnly(handleRoleDefinitionRead(authority)))
	mux.HandleFunc("PUT /internal/rbac/role-definitions/{roleName}", dshRbacServiceOnly(handleRoleDefinitionWrite(authority)))
	mux.Handle("/", next)
	return mux
}

func dshRbacServiceOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "dsh" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expected := strings.TrimSpace(os.Getenv("IDENTITY_DSH_SERVICE_TOKEN"))
		if expected == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "internal RBAC API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expected)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "service token is required")
			return
		}
		operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if operatorContextID == "" || operatorContextID == "legacy-unscoped" {
			sendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "X-Operator-Context-ID is required")
			return
		}
		next(w, r)
	}
}

func handlePermissionVocabulary(authority *identity.PermissionEnforcer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entries, err := authority.ListPermissionVocabulary(r.Context(), r.URL.Query().Get("service"), r.URL.Query().Get("surface"))
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load permission vocabulary")
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"permissions": entries})
	}
}

func handleRoleDefinitionRead(authority *identity.PermissionEnforcer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, err := authority.GetRoleDefinition(r.Context(), r.PathValue("roleName"))
		if errors.Is(err, identity.ErrRoleNotFound) {
			sendError(w, http.StatusNotFound, "ROLE_NOT_FOUND", err.Error())
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load role definition")
			return
		}
		sendJSON(w, http.StatusOK, role)
	}
}

func handleRoleDefinitionWrite(authority *identity.PermissionEnforcer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		if idempotencyKey == "" {
			sendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", identity.ErrIdempotencyKeyRequired.Error())
			return
		}
		if strings.TrimSpace(r.Header.Get("X-Canonical-Intent-ID")) != idempotencyKey {
			sendError(w, http.StatusBadRequest, "INVALID_CANONICAL_INTENT", "canonical mutation intent is required")
			return
		}
		var request struct {
			Description     string                `json:"description"`
			Active          *bool                 `json:"active"`
			ExpectedVersion *int                  `json:"expectedVersion"`
			Permissions     []identity.Permission `json:"permissions"`
		}
		if !decodeJSON(w, r, &request) {
			return
		}
		if request.Active == nil || request.ExpectedVersion == nil || *request.ExpectedVersion < 0 {
			sendError(w, http.StatusBadRequest, "INVALID_ROLE_DEFINITION", "active and expectedVersion are required")
			return
		}
		active := *request.Active
		expectedVersion := *request.ExpectedVersion
		role, err := authority.UpsertRoleDefinitionWithOptions(r.Context(), strings.TrimSpace(r.Header.Get("X-Operator-Context-ID")), r.PathValue("roleName"), request.Description, active, expectedVersion, request.Permissions, idempotencyKey, "dsh")
		switch {
		case errors.Is(err, identity.ErrInvalidRoleName), errors.Is(err, identity.ErrPermissionNotInVocabulary), errors.Is(err, identity.ErrIdempotencyKeyRequired):
			sendError(w, http.StatusBadRequest, "INVALID_ROLE_DEFINITION", err.Error())
			return
		case errors.Is(err, identity.ErrIdempotencyConflict), errors.Is(err, identity.ErrRoleVersionConflict):
			sendError(w, http.StatusConflict, "ROLE_DEFINITION_CONFLICT", err.Error())
			return
		case err != nil:
			sendError(w, http.StatusBadRequest, "INVALID_ROLE_DEFINITION", err.Error())
			return
		default:
			sendJSON(w, http.StatusOK, role)
		}
	}
}
