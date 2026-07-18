package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"

	"platform-control-api/internal/auth"
	"platform-control-api/internal/platformcontrol"
)

type server struct {
	service *platformcontrol.Service
	auth    *auth.Client
}

func NewRouter(service *platformcontrol.Service, authClient *auth.Client) http.Handler {
	s := &server{service: service, auth: authClient}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /platform/health", s.publicHealth)
	mux.HandleFunc("GET /platform/readiness", s.publicReadiness)

	mux.HandleFunc("GET /platform/v1/runtime-config", s.operatorOnly("platform:read", s.runtimeConfig))
	mux.HandleFunc("GET /platform/v1/runtime-config/effective", s.operatorOnly("platform:read", s.effectiveRuntimeConfig))
	mux.HandleFunc("GET /platform/v1/variables", s.operatorOnly("platform:read", s.variables))
	mux.HandleFunc("GET /platform/v1/variables/{key}", s.operatorOnly("platform:read", s.variable))
	mux.HandleFunc("GET /platform/v1/feature-flags", s.operatorOnly("platform:read", s.featureFlags))
	mux.HandleFunc("GET /platform/v1/services", s.operatorOnly("platform:read", s.services))
	mux.HandleFunc("GET /platform/v1/health", s.operatorOnly("platform:health:read", s.health))
	mux.HandleFunc("GET /platform/v1/audit-events", s.operatorOnly("platform:audit:read", s.auditEvents))
	mux.HandleFunc("GET /platform/v1/change-sets", s.operatorOnly("platform:read", s.changeSets))
	mux.HandleFunc("GET /platform/v1/change-sets/{id}", s.operatorOnly("platform:read", s.getChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets", s.operatorOnly("platform:variables:propose", s.createChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets/{id}/validate", s.operatorOnly("platform:variables:propose", s.validateChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets/{id}/submit", s.operatorOnly("platform:variables:propose", s.submitChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets/{id}/approve", s.operatorOnly("platform:variables:approve", s.approveChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets/{id}/reject", s.operatorOnly("platform:variables:approve", s.rejectChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets/{id}/apply", s.operatorOnly("platform:variables:apply", s.applyChangeSet))
	mux.HandleFunc("POST /platform/v1/change-sets/{id}/rollback", s.operatorOnly("platform:variables:rollback", s.rollbackChangeSet))

	mux.HandleFunc("GET /platform/v1/rollouts", s.operatorOnly("platform:read", s.listRollouts))
	mux.HandleFunc("GET /platform/v1/rollouts/{id}", s.operatorOnly("platform:read", s.getRollout))
	mux.HandleFunc("POST /platform/v1/rollouts", s.operatorOnly("platform:rollouts:manage", s.createRollout))
	mux.HandleFunc("POST /platform/v1/rollouts/{id}/advance", s.operatorOnly("platform:rollouts:manage", s.advanceRollout))
	mux.HandleFunc("POST /platform/v1/rollouts/{id}/pause", s.operatorOnly("platform:rollouts:manage", s.pauseRollout))
	mux.HandleFunc("POST /platform/v1/rollouts/{id}/abort", s.operatorOnly("platform:rollouts:manage", s.abortRollout))
	mux.HandleFunc("POST /platform/v1/rollouts/{id}/rollback", s.operatorOnly("platform:rollouts:manage", s.rollbackRollout))
	return mux
}

func allowedCorsOrigins() map[string]bool {
	raw := strings.TrimSpace(os.Getenv("PLATFORM_CONTROL_CORS_ALLOWED_ORIGINS"))
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
		w.Header().Set("X-Service", "core-platform-control")
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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

type guardedHandler func(w http.ResponseWriter, r *http.Request, identity auth.Identity)

func (s *server) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasSurfacePermission("dsh", "control-panel", action, "all") &&
			!identity.HasSurfacePermission("core", "control-panel", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "control-panel platform permission is required")
			return
		}
		next(w, r, identity)
	})
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
		next(w, r, identity)
	}
}

func (s *server) runtimeConfig(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	sendJSON(w, http.StatusOK, s.service.RuntimeSnapshot(r.Context()))
}

func (s *server) effectiveRuntimeConfig(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	config, err := s.service.EffectiveRuntimeConfig(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, config)
}

func (s *server) variables(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	variables, err := s.service.Variables(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"variables": variables})
}

func (s *server) variable(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	variable, err := s.service.GetVariable(
		r.Context(),
		r.PathValue("key"),
		r.URL.Query().Get("scopeType"),
		r.URL.Query().Get("scopeId"),
	)
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"variable": variable})
}

func (s *server) featureFlags(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	flags, err := s.service.FeatureFlags(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"flags": flags})
}

func (s *server) services(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	sendJSON(w, http.StatusOK, map[string]any{"services": s.service.Services(r.Context())})
}

func (s *server) health(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	sendJSON(w, http.StatusOK, s.service.Health(r.Context()))
}

func (s *server) auditEvents(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	events, err := s.service.AuditEvents(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"events": events})
}

func (s *server) changeSets(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	changeSets, err := s.service.ChangeSets(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"changeSets": changeSets})
}

func sendJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func sendError(w http.ResponseWriter, status int, code, message string) {
	sendJSON(w, status, platformcontrol.ApiError{Code: code, Message: message})
}
