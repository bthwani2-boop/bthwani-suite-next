package http

import (
	"errors"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

type employeeGovernanceServer struct {
	repo *workforce.Repository
	auth *auth.Client
}

func RegisterEmployeeGovernanceRoutes(handler http.Handler, repo *workforce.Repository, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce employee governance requires *http.ServeMux")
	}
	s := &employeeGovernanceServer{repo: repo, auth: authClient}
	mux.HandleFunc("GET /workforce/employees/{actorId}/governance", s.operatorOnly("provider:read", s.get))
	mux.HandleFunc("PUT /workforce/employees/{actorId}/governance", s.operatorOnly("provider:update", s.put))
}

func (s *employeeGovernanceServer) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identity, err := s.auth.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			if errors.Is(err, auth.ErrIdentityUnavailable) {
				sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
				return
			}
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
			return
		}
		if !identity.HasPermission("workforce", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
			return
		}
		next(w, r, identity)
	}
}

func (s *employeeGovernanceServer) get(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	profile, err := s.repo.EmployeeGovernanceByActorID(r.Context(), strings.TrimSpace(r.PathValue("actorId")))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"employeeGovernance": profile})
}

func (s *employeeGovernanceServer) put(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	var input workforce.UpsertEmployeeGovernanceInput
	if !decodeJSON(w, r, &input) {
		return
	}
	before, _ := s.repo.EmployeeGovernanceByActorID(r.Context(), actorID)
	profile, err := s.repo.UpsertEmployeeGovernance(r.Context(), actorID, identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), actorID,
		"employee.governance.updated", before, profile, input.Notes, r.Header.Get("X-Correlation-ID"))
	sendJSON(w, http.StatusOK, map[string]any{"employeeGovernance": profile})
}
