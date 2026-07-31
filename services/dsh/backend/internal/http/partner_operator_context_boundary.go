package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// withTrustedPartnerOperatorContext resolves OperatorContext ownership from the authenticated
// Identity session. Client OperatorContext headers and query parameters are never read.
func (s *protectedStoreServer) withTrustedPartnerOperatorContext(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.identity == nil {
			store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
			return
		}
		identity, err := s.identity.Resolve(r.Context(), r.Header.Get("Authorization"))
		if errors.Is(err, auth.ErrUnauthenticated) {
			store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "authentication is required")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
			return
		}
		operatorContextID := strings.TrimSpace(identity.OperatorContextID)
		if operatorContextID == "" {
			store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
			return
		}
		ctx := partner.WithOperatorContext(r.Context(), operatorContextID)
		next(w, r.WithContext(ctx))
	}
}

// withOperatorContextPartnerResource rejects cross-OperatorContext partner identifiers before any
// detail, document, visit, store, readiness, transition, or audit handler runs.
// Cross-OperatorContext ownership is intentionally indistinguishable from not found.
func (s *protectedStoreServer) withOperatorContextPartnerResource(next http.HandlerFunc) http.HandlerFunc {
	return s.withTrustedPartnerOperatorContext(func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := partner.OperatorContextIDFromContext(r.Context())
		if !ok {
			store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
			return
		}
		err := partner.EnsureOperatorContextPartner(s.db, operatorContextID, r.PathValue("partnerId"))
		if errors.Is(err, partner.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if errors.Is(err, partner.ErrOperatorContextRequired) {
			store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", err.Error())
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify partner OperatorContext ownership")
			return
		}
		next(w, r)
	})
}

func (s *protectedStoreServer) handleOperatorContextListPartners(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleOperatorContextListPartners(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleOperatorContextCreatePartner(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleOperatorContextCreatePartner(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleOperatorContextFieldListPartnerDrafts(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleOperatorContextListFieldPartnerDrafts(s.db), "field")
}

func (s *protectedStoreServer) handleOperatorContextFieldCreatePartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleOperatorContextFieldCreateDraft(s.db), "field")
}

func (s *protectedStoreServer) handleOperatorContextLinkPartnerStore(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleOperatorContextLinkPartnerStore(s.db), PartnersPermissionManage, "operator")
}
