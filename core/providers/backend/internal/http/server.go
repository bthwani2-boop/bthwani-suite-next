package http

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"

	"providers-api/internal/auth"
	"providers-api/internal/providers"
)

type server struct {
	db      *sql.DB
	service *providers.Service
	repo    *providers.Repository
	auth    *auth.Client
}

func NewRouter(db *sql.DB, service *providers.Service, repo *providers.Repository, authClient *auth.Client) http.Handler {
	s := &server{db: db, service: service, repo: repo, auth: authClient}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /providers/health", s.health)
	mux.HandleFunc("GET /providers", s.operatorOnly("provider:read", s.listProviders))
	mux.HandleFunc("GET /providers/{providerId}", s.operatorOnly("provider:read", s.getProvider))
	mux.HandleFunc("PATCH /providers/{providerId}", s.operatorOnly("provider:update", s.updateProvider))
	mux.HandleFunc("POST /providers/maps/search", s.mapConsumer(s.searchMaps))
	mux.HandleFunc("POST /providers/maps/reverse", s.mapConsumer(s.reverseMap))
	mux.HandleFunc("POST /providers/maps/route", s.mapConsumer(s.routeMaps))
	return mux
}

// allowedCorsOrigins mirrors the identity service convention.
func allowedCorsOrigins() map[string]bool {
	raw := strings.TrimSpace(os.Getenv("PROVIDERS_CORS_ALLOWED_ORIGINS"))
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
		w.Header().Set("X-Service", "core-providers")
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

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	resp, err := s.service.GetHealth(r.Context())
	if err != nil {
		sendError(w, http.StatusInternalServerError, "PROVIDERS_INTERNAL_ERROR", err.Error())
		return
	}
	sendJSON(w, http.StatusOK, resp)
}

// ---- auth guards ----

type guardedHandler func(w http.ResponseWriter, r *http.Request, identity auth.Identity)

func (s *server) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "all") && !identity.HasPermission("providers", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "provider permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *server) mapConsumer(next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		allowedRole := identity.HasRole("client") || identity.HasRole("partner") || identity.HasRole("captain") || identity.HasRole("field") || identity.HasRole("operator") || identity.HasRole("admin")
		allowedPermission := identity.HasPermission("providers", "maps:invoke", "all") || identity.HasPermission("providers", "maps:invoke", "self")
		if !allowedRole && !allowedPermission {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "map-provider invocation is outside the actor scope")
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

// ---- handlers ----

func (s *server) listProviders(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	list, err := s.service.ListProviders(r.Context(), operatorOf(r, identity))
	if err != nil {
		writeProvidersError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, list)
}

func (s *server) getProvider(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	p, err := s.service.GetProvider(r.Context(), r.PathValue("providerId"), operatorOf(r, identity))
	if err != nil {
		writeProvidersError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, p)
}

func (s *server) updateProvider(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input providers.UpdateProviderInput
	if !decodeJSON(w, r, &input) {
		return
	}
	p, err := s.service.UpdateProvider(r.Context(), r.PathValue("providerId"), input,
		operatorOf(r, identity), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeProvidersError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, p)
}

// ---- plumbing ----

func operatorOf(r *http.Request, identity auth.Identity) providers.Operator {
	role := "operator"
	if len(identity.Roles) > 0 {
		role = identity.Roles[0]
	}
	return providers.Operator{ActorID: identity.Subject, Role: role, Token: r.Header.Get("Authorization")}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

func sendJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func sendError(w http.ResponseWriter, status int, code, message string) {
	sendJSON(w, status, providers.ApiError{Code: code, Message: message})
}

func writeProvidersError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, providers.ErrNotFound):
		sendError(w, http.StatusNotFound, "PROVIDER_NOT_FOUND", "provider was not found")
	case errors.Is(err, providers.ErrIdempotencyConflict):
		sendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different request")
	default:
		sendError(w, http.StatusInternalServerError, "PROVIDERS_INTERNAL_ERROR", "providers request failed")
	}
}
