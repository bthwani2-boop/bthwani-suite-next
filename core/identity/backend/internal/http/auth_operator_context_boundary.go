package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"identity-api/internal/identity"
)

type authOperatorContextRepository interface {
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

func authResponseRequiresOperatorContextCheck(r *http.Request) bool {
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

func authRequestRequiresBearerOperatorContextCheck(r *http.Request) bool {
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

func operatorContextFromAuthResponse(body []byte) (operatorContextID, accessToken string) {
	var payload struct {
		OperatorContextID    string `json:"operatorContextId"`
		AccessToken string `json:"accessToken"`
		Identity    struct {
			OperatorContextID string `json:"operatorContextId"`
		} `json:"identity"`
	}
	if json.Unmarshal(body, &payload) != nil {
		return "", ""
	}
	operatorContextID = strings.TrimSpace(payload.Identity.OperatorContextID)
	if operatorContextID == "" {
		operatorContextID = strings.TrimSpace(payload.OperatorContextID)
	}
	return operatorContextID, strings.TrimSpace(payload.AccessToken)
}

func requireBearerOperatorContext(
	w http.ResponseWriter,
	r *http.Request,
	repository authOperatorContextRepository,
	operatorContextID string,
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
	if strings.TrimSpace(resolved.OperatorContextID) != operatorContextID {
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "session belongs to another operator context")
		return false
	}
	return true
}

// AuthOperatorContextBoundary prevents Identity from issuing or exposing
// a session belonging to any operator context other than the trusted runtime context. New
// cross-context sessions are immediately revoked before the response is hidden.
func AuthOperatorContextBoundary(repository authOperatorContextRepository, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		operatorContextID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))
		if operatorContextID == "" || !strings.HasPrefix(r.URL.Path, "/auth/") {
			next.ServeHTTP(w, r)
			return
		}
		if authRequestRequiresBearerOperatorContextCheck(r) && !requireBearerOperatorContext(w, r, repository, operatorContextID) {
			return
		}
		if !authResponseRequiresOperatorContextCheck(r) {
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
		responseOperatorContextID, accessToken := operatorContextFromAuthResponse(buffered.body.Bytes())
		if responseOperatorContextID == "" {
			if accessToken != "" {
				_ = repository.Logout(r.Context(), accessToken)
			}
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "identity response has no trusted operator context")
			return
		}
		if responseOperatorContextID != operatorContextID {
			if accessToken != "" {
				_ = repository.Logout(r.Context(), accessToken)
			}
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "identity belongs to another operator context")
			return
		}
		flushBufferedResponse(w, buffered)
	})
}
