package http

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"strings"

	"identity-api/internal/identity"
)

type server struct {
	db         *sql.DB
	repository *identity.Repository
}

func NewRouter(db *sql.DB, repository *identity.Repository) http.Handler {
	s := &server{db: db, repository: repository}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /identity/health", s.health)
	mux.HandleFunc("GET /identity/readiness", s.readiness)
	mux.HandleFunc("POST /auth/login", s.login)
	mux.HandleFunc("POST /auth/activate", s.activate)
	mux.HandleFunc("POST /auth/refresh", s.refresh)
	mux.HandleFunc("POST /auth/logout", s.logout)
	mux.HandleFunc("GET /auth/session", s.session)
	mux.HandleFunc("POST /auth/introspect", s.introspect)
	mux.HandleFunc("POST /internal/actors/provision", s.serviceOnly(s.provisionActor))
	mux.HandleFunc("GET /internal/actors/search", s.serviceOnly(s.internalActorSearch))
	mux.HandleFunc("GET /internal/actors/{actorId}", s.serviceOnly(s.internalActorGet))
	mux.HandleFunc("POST /internal/actors/{actorId}/deactivate", s.serviceOnly(s.internalActorDeactivate))
	mux.HandleFunc("POST /internal/actors/{actorId}/reactivate", s.serviceOnly(s.internalActorReactivate))
	mux.HandleFunc("POST /internal/actors/{actorId}/activations", s.serviceOnly(s.internalActorIssueActivation))
	mux.HandleFunc("POST /internal/actors/{actorId}/activations/revoke", s.serviceOnly(s.internalActorRevokeActivations))
	return mux
}

// serviceOnly guards the /internal surface. Workforce is currently the only
// allowed caller for actor provisioning/activation; it must present its own
// service credential and a stable caller header. A non-empty caller header is
// not sufficient authorization.
func (s *server) serviceOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		expectedCaller := "workforce"
		caller := strings.TrimSpace(r.Header.Get("X-Service-Caller"))
		if caller != expectedCaller {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expected := strings.TrimSpace(os.Getenv("IDENTITY_WORKFORCE_SERVICE_TOKEN"))
		if expected == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "internal API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expected)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "service token is required")
			return
		}
		next(w, r)
	}
}

// allowedCorsOrigins reads IDENTITY_CORS_ALLOWED_ORIGINS (comma-separated)
// so each deployment environment configures its own real origins instead of
// this service hardcoding a single localhost dev port. Falls back to the
// local control-panel dev origin only when the env var is unset, matching
// prior behavior for local development.
func allowedCorsOrigins() map[string]bool {
	raw := strings.TrimSpace(os.Getenv("IDENTITY_CORS_ALLOWED_ORIGINS"))
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
		w.Header().Set("X-Service", "core-identity")
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Fingerprint, Idempotency-Key, X-Correlation-ID")
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
	sendJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "core-identity"})
}

func (s *server) readiness(w http.ResponseWriter, r *http.Request) {
	if err := s.db.PingContext(r.Context()); err != nil {
		sendError(w, http.StatusServiceUnavailable, "IDENTITY_NOT_READY", "identity database is unavailable")
		return
	}
	sendJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "core-identity"})
}

func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Username          string `json:"username"`
		Password          string `json:"password"`
		DeviceFingerprint string `json:"deviceFingerprint"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	pair, err := s.repository.Login(r.Context(), request.Username, request.Password, request.DeviceFingerprint, clientIP(r))
	if err != nil {
		if err == identity.ErrLoginRateLimited {
			sendError(w, http.StatusTooManyRequests, "LOGIN_RATE_LIMITED", "too many failed attempts; try again later")
			return
		}
		sendError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid username or password")
		return
	}
	sendJSON(w, http.StatusOK, tokenResponse(pair))
}

func (s *server) activate(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ActorType         string `json:"actorType"`
		Phone             string `json:"phone"`
		Code              string `json:"code"`
		DeviceFingerprint string `json:"deviceFingerprint"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	pair, err := s.repository.ConsumeActivation(r.Context(), identity.ConsumeActivationInput{
		ActorType:         request.ActorType,
		Phone:             request.Phone,
		Code:              request.Code,
		DeviceFingerprint: request.DeviceFingerprint,
	})
	if err != nil {
		writeActivationError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, tokenResponse(pair))
}

func (s *server) refresh(w http.ResponseWriter, r *http.Request) {
	var request struct {
		RefreshToken string `json:"refreshToken"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	pair, err := s.repository.Refresh(r.Context(), request.RefreshToken)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "refresh token is invalid or expired")
		return
	}
	sendJSON(w, http.StatusOK, tokenResponse(pair))
}

func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	token, ok := bearerToken(r)
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer token is required")
		return
	}
	if err := s.repository.Logout(r.Context(), token); err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "could not revoke session")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) session(w http.ResponseWriter, r *http.Request) {
	token, ok := bearerToken(r)
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer token is required")
		return
	}
	resolved, err := s.repository.ResolveAccessToken(r.Context(), token)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
		return
	}
	sendJSON(w, http.StatusOK, resolved)
}

func (s *server) introspect(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	resolved, err := s.repository.ResolveAccessToken(r.Context(), request.Token)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "token is invalid or expired")
		return
	}
	sendJSON(w, http.StatusOK, resolved)
}

func (s *server) provisionActor(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Username  string `json:"username"`
		PhoneE164 string `json:"phoneE164"`
		Role      string `json:"role"`
		TenantID  string `json:"tenantId"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	view, err := s.repository.ProvisionActor(r.Context(), identity.ProvisionActorInput{
		Username:  request.Username,
		PhoneE164: request.PhoneE164,
		Role:      request.Role,
		TenantID:  request.TenantID,
	})
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, view)
}

func (s *server) internalActorGet(w http.ResponseWriter, r *http.Request) {
	view, err := s.repository.ActorAdminByID(r.Context(), r.PathValue("actorId"))
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, view)
}

// internalActorSearch backs Workforce's supervisor picker: role+query
// lookup instead of the free-text actor-id box the HR screen used to
// expose. Results are capped and never include password hashes.
func (s *server) internalActorSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	views, err := s.repository.SearchActors(r.Context(), strings.TrimSpace(query.Get("role")), strings.TrimSpace(query.Get("q")), 25)
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"actors": views})
}

func (s *server) internalActorDeactivate(w http.ResponseWriter, r *http.Request) {
	if err := s.repository.DeactivateActor(r.Context(), r.PathValue("actorId")); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) internalActorReactivate(w http.ResponseWriter, r *http.Request) {
	if err := s.repository.ReactivateActor(r.Context(), r.PathValue("actorId")); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) internalActorIssueActivation(w http.ResponseWriter, r *http.Request) {
	var request struct {
		IssuedByActorID   string `json:"issuedByActorId"`
		ExpectedActorType string `json:"expectedActorType"`
		ExpectedSurface   string `json:"expectedSurface"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	if strings.TrimSpace(request.IssuedByActorID) == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "issuedByActorId is required")
		return
	}
	result, err := s.repository.IssueActivationForActor(
		r.Context(), r.PathValue("actorId"), identity.IssueActivationForActorInput{
			IssuedByActorID:   request.IssuedByActorID,
			ExpectedActorType: request.ExpectedActorType,
			ExpectedSurface:   request.ExpectedSurface,
		},
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		writeInternalActorError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, result)
}

func (s *server) internalActorRevokeActivations(w http.ResponseWriter, r *http.Request) {
	if err := s.repository.RevokeActivationChallenges(r.Context(), r.PathValue("actorId")); err != nil {
		writeInternalActorError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeInternalActorError(w http.ResponseWriter, err error) {
	switch err {
	case identity.ErrActorNotFound:
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
	case identity.ErrPhoneAlreadyBound:
		sendError(w, http.StatusConflict, "PHONE_ALREADY_BOUND", "phone is already bound to another actor")
	case identity.ErrUsernameTaken:
		sendError(w, http.StatusConflict, "USERNAME_TAKEN", "username is already taken")
	case identity.ErrActivationRateLimited:
		sendError(w, http.StatusTooManyRequests, "ACTIVATION_RATE_LIMITED", "activation can be requested again later")
	case identity.ErrActivationUnavailable:
		sendError(w, http.StatusServiceUnavailable, "ACTIVATION_UNAVAILABLE", "activation is not configured")
	case identity.ErrInvalidActivation:
		sendError(w, http.StatusUnprocessableEntity, "INVALID_ACTOR_INPUT", "actor input is invalid")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
	}
}

func tokenResponse(pair identity.TokenPair) map[string]any {
	return map[string]any{
		"accessToken": pair.AccessToken, "refreshToken": pair.RefreshToken,
		"tokenType": "Bearer", "expiresIn": 900, "identity": pair.Identity,
	}
}

func bearerToken(r *http.Request) (string, bool) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(header, "Bearer ") {
		return "", false
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	return token, token != ""
}

// clientIP extracts the caller's address for login-attempt auditing. It
// trusts X-Forwarded-For only as a best-effort signal (this service sits
// behind infra-controlled proxies in every deployed environment); it is
// never used for any authorization decision, only for the audit record.
func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		if first, _, found := strings.Cut(forwarded, ","); found {
			return strings.TrimSpace(first)
		}
		return forwarded
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
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
	sendJSON(w, status, identity.ApiError{Code: code, Message: message})
}

func writeActivationError(w http.ResponseWriter, err error) {
	switch err {
	case identity.ErrForbidden:
		sendError(w, http.StatusForbidden, "FORBIDDEN", "activation is not allowed")
	case identity.ErrActivationRateLimited:
		sendError(w, http.StatusTooManyRequests, "ACTIVATION_RATE_LIMITED", "activation can be requested again later")
	case identity.ErrActivationUnavailable:
		sendError(w, http.StatusServiceUnavailable, "ACTIVATION_UNAVAILABLE", "activation is not configured")
	case identity.ErrActivationTargetAbsent:
		sendError(w, http.StatusNotFound, "ACTIVATION_TARGET_NOT_FOUND", "activation target was not found")
	case identity.ErrInvalidActivation:
		sendError(w, http.StatusUnauthorized, "INVALID_ACTIVATION", "activation code is invalid or expired")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
	}
}
