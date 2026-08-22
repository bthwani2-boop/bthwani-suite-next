package http

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

type serviceHandler func(http.ResponseWriter, *http.Request)

func (s *server) serviceOnly(caller string, next serviceHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		expectedToken := strings.TrimSpace(os.Getenv("PLATFORM_CONTROL_DSH_SERVICE_TOKEN"))
		providedToken := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if expectedToken == "" || len(providedToken) != len(expectedToken) ||
			subtle.ConstantTimeCompare([]byte(providedToken), []byte(expectedToken)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "trusted service authentication is required")
			return
		}
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != caller {
			sendError(w, http.StatusForbidden, "UNTRUSTED_SERVICE_CALLER", "the service caller is not allowed")
			return
		}
		if strings.TrimSpace(r.Header.Get("X-Operator-Context-ID")) == "" {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted operator context is required")
			return
		}
		next(w, r)
	}
}

func (s *server) internalVariable(w http.ResponseWriter, r *http.Request) {
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
