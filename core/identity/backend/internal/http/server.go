package http

import (
	"database/sql"
	"encoding/json"
	"net/http"
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
	mux.HandleFunc("POST /auth/refresh", s.refresh)
	mux.HandleFunc("POST /auth/logout", s.logout)
	mux.HandleFunc("GET /auth/session", s.session)
	mux.HandleFunc("POST /auth/introspect", s.introspect)
	return mux
}

func CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "core-identity")
		origin := r.Header.Get("Origin")
		if origin == "http://localhost:13000" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Fingerprint")
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
	pair, err := s.repository.Login(r.Context(), request.Username, request.Password, request.DeviceFingerprint)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid username or password")
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
