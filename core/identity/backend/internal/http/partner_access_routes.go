package http

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"

	"identity-api/internal/identity"
)

type partnerAccessServer struct{}

func RegisterPartnerAccessRoutes(handler http.Handler, repository *identity.Repository) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("identity partner access routes require *http.ServeMux")
	}
	s := &partnerAccessServer{}
	mux.HandleFunc("GET /internal/partner/permission-bundles", s.dshOnly(s.permissionBundles))
}

func (s *partnerAccessServer) dshOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "dsh" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
			return
		}
		expectedToken := strings.TrimSpace(os.Getenv("IDENTITY_DSH_SERVICE_TOKEN"))
		if expectedToken == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "DSH internal API is not configured")
			return
		}
		token, ok := bearerToken(r)
		if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "DSH service token is required")
			return
		}
		operatorContextID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))
		if operatorContextID == "" {
			sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "trusted operator context is not configured")
			return
		}
		requestedOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if requestedOperatorContextID == "" {
			sendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "X-Operator-Context-ID is required")
			return
		}
		if subtle.ConstantTimeCompare([]byte(requestedOperatorContextID), []byte(operatorContextID)) != 1 {
			sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_FORBIDDEN", "service operator context does not match the active runtime context")
			return
		}
		next(w, r)
	}
}

func (s *partnerAccessServer) permissionBundles(w http.ResponseWriter, _ *http.Request) {
	sendJSON(w, http.StatusOK, map[string]any{"permissionBundles": identity.PartnerPermissionBundles()})
}
