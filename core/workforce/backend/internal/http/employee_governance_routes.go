package http

import (
	"errors"
	"net/http"
	"strings"

	auth "github.com/bthwani2-boop/bthwani-identityauth"
	workforceauth "workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

type employeeGovernanceServer struct {
	service *workforce.Service
	auth    *auth.Client
}

func RegisterEmployeeGovernanceRoutes(handler http.Handler, service *workforce.Service, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce employee governance requires *http.ServeMux")
	}
	s := &employeeGovernanceServer{service: service, auth: authClient}
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
		boundContext, bindErr := workforceauth.BindIdentityContext(r.Context(), identity)
		if bindErr != nil {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "identity operator context is missing")
			return
		}
		r = r.WithContext(boundContext)
		if !identity.HasPermission("workforce", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
			return
		}
		next(w, r, identity)
	}
}

func (s *employeeGovernanceServer) get(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	profile, err := s.service.EmployeeGovernanceByActorID(r.Context(), strings.TrimSpace(r.PathValue("actorId")))
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
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	// Canonical governed write: mutation + audit (+ idempotent response) in
	// one transaction through the service boundary.
	profile, err := s.service.UpsertEmployeeGovernance(r.Context(), operatorOf(r, identity), actorID, input, idempotencyKey, correlationID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"employeeGovernance": profile})
}
