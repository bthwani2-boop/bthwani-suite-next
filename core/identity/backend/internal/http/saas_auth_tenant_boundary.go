package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"identity-api/internal/identity"
)

type authTenantRepository interface {
	ResolveAccessToken(ctx context.Context, accessToken string) (identity.ActorIdentity, error)
	Logout(ctx context.Context, accessToken string) error
}

type bufferedResponseWriter struct {
	header http.Header
	body   bytes.Buffer
	status int
}

func newBufferedResponseWriter() *bufferedResponseWriter {
	return &bufferedResponseWriter{header: make(http.Header)}
}

func (w *bufferedResponseWriter) Header() http.Header { return w.header }

func (w *bufferedResponseWriter) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
}

func (w *bufferedResponseWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.body.Write(body)
}

func flushBufferedResponse(destination http.ResponseWriter, source *bufferedResponseWriter) {
	for name, values := range source.header {
		for _, value := range values {
			destination.Header().Add(name, value)
		}
	}
	status := source.status
	if status == 0 {
		status = http.StatusOK
	}
	destination.WriteHeader(status)
	_, _ = destination.Write(source.body.Bytes())
}

func authResponseRequiresTenantCheck(r *http.Request) bool {
	if r.Method == http.MethodGet && r.URL.Path == "/auth/session" {
		return true
	}
	if r.Method != http.MethodPost {
		return false
	}
	switch r.URL.Path {
	case "/auth/login", "/auth/activate", "/auth/refresh", "/auth/introspect":
		return true
	default:
		return false
	}
}

func authRequestRequiresBearerTenantCheck(r *http.Request) bool {
	if r.URL.Path == "/auth/logout" {
		return false
	}
	if r.Method == http.MethodGet && r.URL.Path == "/auth/sessions" {
		return true
	}
	if r.Method == http.MethodDelete && (r.URL.Path == "/auth/account" || strings.HasPrefix(r.URL.Path, "/auth/sessions/")) {
		return true
	}
	return r.Method == http.MethodPost && r.URL.Path == "/auth/password/change"
}

func tenantFromAuthResponse(body []byte) (tenantID, accessToken string) {
	var payload struct {
		TenantID    string `json:"tenantId"`
		AccessToken string `json:"accessToken"`
		Identity    struct {
			TenantID string `json:"tenantId"`
		} `json:"identity"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return "", ""
	}
	tenantID = strings.TrimSpace(payload.Identity.TenantID)
	if tenantID == "" {
		tenantID = strings.TrimSpace(payload.TenantID)
	}
	return tenantID, strings.TrimSpace(payload.AccessToken)
}

func requireBearerTenant(
	w http.ResponseWriter,
	r *http.Request,
	repository authTenantRepository,
	tenantID string,
) bool {
	token, ok := bearerToken(r)
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer token is required")
		return false
	}
	resolved, err := repository.ResolveAccessToken(r.Context(), token)
	if err != nil {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
		return false
	}
	if strings.TrimSpace(resolved.TenantID) != tenantID {
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "session belongs to another tenant")
		return false
	}
	return true
}

// SaaSAuthTenantBoundary prevents active SaaS Identity from issuing or exposing
// a session belonging to any tenant other than the trusted runtime tenant. New
// cross-tenant sessions are immediately revoked before the response is hidden.
func SaaSAuthTenantBoundary(repository authTenantRepository, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID, active, err := activeSaaSTenant()
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", err.Error())
			return
		}
		if !active || !strings.HasPrefix(r.URL.Path, "/auth/") {
			next.ServeHTTP(w, r)
			return
		}
		if authRequestRequiresBearerTenantCheck(r) && !requireBearerTenant(w, r, repository, tenantID) {
			return
		}
		if !authResponseRequiresTenantCheck(r) {
			next.ServeHTTP(w, r)
			return
		}

		buffered := newBufferedResponseWriter()
		next.ServeHTTP(buffered, r)
		status := buffered.status
		if status == 0 {
			status = http.StatusOK
		}
		if status < 200 || status >= 300 {
			flushBufferedResponse(w, buffered)
			return
		}
		responseTenantID, accessToken := tenantFromAuthResponse(buffered.body.Bytes())
		if responseTenantID == "" {
			if accessToken != "" {
				_ = repository.Logout(r.Context(), accessToken)
			}
			sendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", "identity response has no trusted tenant context")
			return
		}
		if responseTenantID != tenantID {
			if accessToken != "" {
				_ = repository.Logout(r.Context(), accessToken)
			}
			sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "identity belongs to another tenant")
			return
		}
		flushBufferedResponse(w, buffered)
	})
}
