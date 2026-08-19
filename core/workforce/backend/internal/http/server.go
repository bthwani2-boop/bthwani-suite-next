package http

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
	"workforce-api/internal/media"
	"workforce-api/internal/workforce"
)

type server struct {
	db               *sql.DB
	service          *workforce.Service
	repo             *workforce.Repository
	auth             *auth.Client
	identity         *identityclient.Client
	media            *media.Provider
	internalDSHToken string
	readinessStore   workforceRuntimeReadinessStore
}

func NewRouter(db *sql.DB, service *workforce.Service, repo *workforce.Repository, authClient *auth.Client, identityClient *identityclient.Client, mediaProvider *media.Provider, internalDSHToken string) http.Handler {
	s := &server{db: db, service: service, repo: repo, auth: authClient, identity: identityClient, media: mediaProvider, internalDSHToken: strings.TrimSpace(internalDSHToken)}
	if db != nil {
		s.readinessStore = sqlWorkforceRuntimeReadinessStore{db: db}
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /workforce/health", s.health)
	mux.HandleFunc("GET /workforce/readiness", s.readiness)
	mux.HandleFunc("GET /workforce/readiness/{actorId}", s.anyAuthenticated(s.handleGetCurrentProviderReadiness))

	//	mux.HandleFunc("POST /workforce/employees/{actorId}/media/uploads", s.operatorOnly("provider:update", s.handleMediaUpload))
	//	mux.HandleFunc("POST /workforce/captains/{actorId}/media/uploads", s.operatorOnly("provider:update", s.handleMediaUpload))
	//	mux.HandleFunc("POST /workforce/field-agents/{actorId}/media/uploads", s.operatorOnly("provider:update", s.handleMediaUpload))

	mux.HandleFunc("POST /workforce/field-agents", s.operatorOnly("provider:create", s.createFieldAgent))
	mux.HandleFunc("GET /workforce/field-agents", s.operatorOnly("provider:read", s.listFieldAgents))
	mux.HandleFunc("GET /workforce/field-agents/{actorId}", s.operatorOnly("provider:read", s.getFieldAgent))
	mux.HandleFunc("PATCH /workforce/field-agents/{actorId}", s.operatorOnly("provider:update", s.updateFieldAgent))
	mux.HandleFunc("POST /workforce/field-agents/{actorId}/suspend", s.operatorOnly("provider:suspend", s.suspendFieldAgent))
	mux.HandleFunc("POST /workforce/field-agents/{actorId}/reactivate", s.operatorOnly("provider:reactivate", s.reactivateFieldAgent))
	mux.HandleFunc("POST /workforce/field-agents/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.issueActivation))
	mux.HandleFunc("DELETE /workforce/field-agents/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.revokeActivation))

	mux.HandleFunc("POST /workforce/captains", s.operatorOnly("provider:create", s.createCaptain))
	mux.HandleFunc("GET /workforce/captains", s.operatorOnly("provider:read", s.listCaptains))
	mux.HandleFunc("GET /workforce/captains/{actorId}", s.operatorOnly("provider:read", s.getCaptain))
	mux.HandleFunc("PATCH /workforce/captains/{actorId}", s.operatorOnly("provider:update", s.updateCaptain))
	mux.HandleFunc("POST /workforce/captains/{actorId}/suspend", s.operatorOnly("provider:suspend", s.suspendFieldAgent))
	mux.HandleFunc("POST /workforce/captains/{actorId}/reactivate", s.operatorOnly("provider:reactivate", s.reactivateFieldAgent))
	mux.HandleFunc("POST /workforce/captains/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.issueActivation))
	mux.HandleFunc("DELETE /workforce/captains/{actorId}/activation-codes", s.operatorOnly("provider.activation:issue", s.revokeActivation))

	mux.HandleFunc("POST /workforce/employees", s.operatorOnly("provider:create", s.createEmployee))
	mux.HandleFunc("GET /workforce/employees", s.operatorOnly("provider:read", s.listEmployees))
	mux.HandleFunc("GET /workforce/employees/{actorId}", s.operatorOnly("provider:read", s.getEmployee))
	mux.HandleFunc("PATCH /workforce/employees/{actorId}", s.operatorOnly("provider:update", s.updateEmployee))
	mux.HandleFunc("POST /workforce/employees/{actorId}/suspend", s.operatorOnly("provider:suspend", s.suspendFieldAgent))
	mux.HandleFunc("POST /workforce/employees/{actorId}/reactivate", s.operatorOnly("provider:reactivate", s.reactivateFieldAgent))

	mux.HandleFunc("GET /workforce/me", s.providerSelf("provider:read", s.me))
	mux.HandleFunc("PATCH /workforce/me", s.providerSelf("provider:update", s.updateMe))

	mux.HandleFunc("GET /workforce/reference/cities", s.anyAuthenticated(s.listCities))
	mux.HandleFunc("GET /workforce/reference/shifts", s.anyAuthenticated(s.listShifts))
	mux.HandleFunc("POST /workforce/reference/shifts", s.operatorOnly("reference:manage", s.createShift))
	mux.HandleFunc("PATCH /workforce/reference/shifts/{code}", s.operatorOnly("reference:manage", s.updateShift))
	mux.HandleFunc("GET /workforce/reference/supervisors", s.operatorOnly("provider:read", s.searchSupervisors))

	// DSH consumes Workforce-owned operational assignments as read-only truth.
	mux.HandleFunc("GET /internal/assignments/{actorId}/scopes", s.internalOnly(s.handleGetActorScopes))
	return mux
}

func (s *server) internalOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if s.internalDSHToken == "" || subtle.ConstantTimeCompare([]byte(token), []byte(s.internalDSHToken)) != 1 || r.Header.Get("X-Service-Caller") != "dsh" {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "valid DSH service identity is required")
			return
		}
		next(w, r)
	}
}

// allowedCorsOrigins mirrors the identity service convention.
func allowedCorsOrigins() map[string]bool {
	raw := strings.TrimSpace(os.Getenv("WORKFORCE_CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return map[string]bool{"http://localhost:13000": true}
	}
	origins := map[string]bool{}
	for _, origin := range strings.Split(raw, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			origins[origin] = true
		}
	}
	return origins
}

func CorsMiddleware(next http.Handler) http.Handler {
	allowed := allowedCorsOrigins()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "core-workforce")
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	sendJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "core-workforce"})
}

// ---- auth guards ----

type guardedHandler func(w http.ResponseWriter, r *http.Request, identity auth.Identity)

func (s *server) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *server) providerSelf(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "own") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "own provider permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *server) anyAuthenticated(next guardedHandler) http.HandlerFunc {
	return s.withIdentity(next)
}

func (s *server) withIdentity(next guardedHandler) http.HandlerFunc {
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
		boundContext, bindErr := auth.BindIdentityContext(r.Context(), identity)
		if bindErr != nil {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "identity operator context is missing")
			return
		}
		r = r.WithContext(boundContext)
		next(w, r, identity)
	}
}

// ---- field agents ----

func (s *server) createFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.CreateFieldAgentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}
	person, replayed, err := s.service.CreateFieldAgent(r.Context(), operatorOf(r, identity), input,
		idempotencyKey, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	sendJSON(w, status, person)
}

func (s *server) listFieldAgents(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	query := r.URL.Query()
	limit, _ := strconv.Atoi(query.Get("limit"))
	offset, _ := strconv.Atoi(query.Get("offset"))
	people, err := s.repo.ListPeople(r.Context(), workforce.ListFilter{
		Status:        strings.TrimSpace(query.Get("status")),
		CityCode:      strings.TrimSpace(query.Get("city")),
		Query:         strings.TrimSpace(query.Get("q")),
		WorkforceKind: "field",
		Limit:         limit,
		Offset:        offset,
	})
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"fieldAgents": people})
}

func (s *server) getFieldAgent(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	detail, err := s.service.FieldAgentByID(r.Context(), r.PathValue("actorId"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, detail)
}

func (s *server) updateFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.UpdateFieldAgentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.UpdateFieldAgent(r.Context(), operatorOf(r, identity),
		r.PathValue("actorId"), input, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *server) suspendFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.Suspend(r.Context(), operatorOf(r, identity),
		r.PathValue("actorId"), input.ExpectedVersion, input.Reason, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *server) reactivateFieldAgent(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	person, err := s.service.Reactivate(r.Context(), operatorOf(r, identity),
		r.PathValue("actorId"), input.ExpectedVersion, input.Reason, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, person)
}

func (s *server) issueActivation(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	code, err := s.service.IssueActivation(r.Context(), operatorOf(r, identity),
		r.PathValue("actorId"), input.ExpectedVersion, activationActorType(r), activationSurface(r),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, code)
}