package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// ── Platform catalog policies ────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogPolicies(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionPolicyRead); !ok {
		return
	}
	items, err := centralcatalog.ListCatalogPolicies(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policies": items})
}

// ── Store assortment ─────────────────────────────────────────────────────────

func (s *protectedStoreServer) handleOperatorGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentRead); !ok {
		return
	}
	items, err := centralcatalog.ListStoreAssortmentRuntimeTruth(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": items})
}

func (s *protectedStoreServer) handlePartnerGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	_ = actor
	items, err := centralcatalog.ListStoreAssortmentRuntimeTruth(r.Context(), s.db, storeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": items})
}

func (s *protectedStoreServer) handleFieldGetStoreAssortment(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	items, err := centralcatalog.ListStoreAssortmentRuntimeTruth(r.Context(), s.db, storeID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	commercial := make(map[string]centralcatalog.StoreAssortmentCommercialReadback, len(items))
	for _, item := range items {
		readback, readbackErr := centralcatalog.GetAssortmentCommercialReadback(r.Context(), s.db, storeID, item.MasterProductID)
		if errors.Is(readbackErr, centralcatalog.ErrNotFound) {
			continue
		}
		if readbackErr != nil {
			s.writeCentralCatalogError(w, readbackErr)
			return
		}
		commercial[item.MasterProductID] = readback
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"storeId": storeID, "assortment": items, "commercial": commercial})
}
