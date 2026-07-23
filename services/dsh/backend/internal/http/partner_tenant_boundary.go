package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// withTrustedPartnerTenant resolves tenant ownership from the authenticated
// Identity session. Client tenant headers and query parameters are never read.
func (s *protectedStoreServer) withTrustedPartnerTenant(next http.HandlerFunc) http.HandlerFunc {
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
		tenantID := strings.TrimSpace(identity.TenantID)
		if tenantID == "" {
			store.SendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", "trusted tenant context is required")
			return
		}
		ctx := partner.WithTenantContext(r.Context(), tenantID)
		next(w, r.WithContext(ctx))
	}
}

// withTenantPartnerResource rejects cross-tenant partner identifiers before any
// detail, document, visit, store, readiness, transition, or audit handler runs.
// Cross-tenant ownership is intentionally indistinguishable from not found.
func (s *protectedStoreServer) withTenantPartnerResource(next http.HandlerFunc) http.HandlerFunc {
	return s.withTrustedPartnerTenant(func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := partner.TenantIDFromContext(r.Context())
		if !ok {
			store.SendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", "trusted tenant context is required")
			return
		}
		err := partner.EnsureTenantPartner(s.db, tenantID, r.PathValue("partnerId"))
		if errors.Is(err, partner.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if errors.Is(err, partner.ErrTenantContextRequired) {
			store.SendError(w, http.StatusForbidden, "TENANT_CONTEXT_REQUIRED", err.Error())
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify partner tenant ownership")
			return
		}
		next(w, r)
	})
}

func (s *protectedStoreServer) handleTenantListPartners(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleTenantListPartners(s.db), PartnersPermissionRead, "operator")
}

func (s *protectedStoreServer) handleTenantCreatePartner(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleTenantCreatePartner(s.db), PartnersPermissionManage, "operator")
}

func (s *protectedStoreServer) handleTenantFieldListPartnerDrafts(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleTenantListFieldPartnerDrafts(s.db), "field")
}

func (s *protectedStoreServer) handleTenantFieldCreatePartnerDraft(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleTenantFieldCreateDraft(s.db), "field")
}

func (s *protectedStoreServer) handleTenantLinkPartnerStore(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(w, r, partner.HandleTenantLinkPartnerStore(s.db), PartnersPermissionManage, "operator")
}
