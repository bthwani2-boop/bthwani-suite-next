package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleOperatorUpsertAssortmentInventory(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentManage)
	if !ok {
		return
	}
	s.upsertAssortmentInventory(w, r, actor.ID, "operator", r.PathValue("storeId"))
}

func (s *protectedStoreServer) handlePartnerGetAssortmentInventory(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		s.writeCatalogMutationError(w, centralcatalog.ErrForbidden)
		return
	}
	inventory, err := centralcatalog.GetAssortmentInventoryRuntimeTruth(r.Context(), s.db, storeID, r.PathValue("masterProductId"))
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"inventory": inventory})
}

func (s *protectedStoreServer) handlePartnerUpsertAssortmentInventory(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		s.writeCatalogMutationError(w, centralcatalog.ErrForbidden)
		return
	}
	s.upsertAssortmentInventory(w, r, actor.ID, "partner", storeID)
}

func (s *protectedStoreServer) handleOperatorScheduleAssortmentPrice(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentManage)
	if !ok {
		return
	}
	s.scheduleAssortmentPrice(w, r, actor.ID, "operator", r.PathValue("storeId"))
}

func (s *protectedStoreServer) handlePartnerListAssortmentPrices(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		s.writeCatalogMutationError(w, centralcatalog.ErrForbidden)
		return
	}
	prices, err := centralcatalog.ListAssortmentPriceRuntimeTruth(r.Context(), s.db, storeID, r.PathValue("masterProductId"))
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"priceSchedules": prices})
}

func (s *protectedStoreServer) handlePartnerScheduleAssortmentPrice(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		s.writeCatalogMutationError(w, centralcatalog.ErrForbidden)
		return
	}
	s.scheduleAssortmentPrice(w, r, actor.ID, "partner", storeID)
}

func (s *protectedStoreServer) upsertAssortmentInventory(w http.ResponseWriter, r *http.Request, actorID, actorRole, storeID string) {
	masterProductID := r.PathValue("masterProductId")
	var input centralcatalog.StoreAssortmentInventoryInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(storeID) == "" || strings.TrimSpace(masterProductID) == "" {
		s.writeCatalogMutationError(w, centralcatalog.ErrInvalid)
		return
	}

	inv, err := centralcatalog.UpsertAssortmentInventoryWithRuntimeTruthAtomic(r.Context(), s.db, storeID, masterProductID, actorID, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"inventory": inv})
}

func (s *protectedStoreServer) scheduleAssortmentPrice(w http.ResponseWriter, r *http.Request, actorID, actorRole, storeID string) {
	masterProductID := r.PathValue("masterProductId")
	var input centralcatalog.StoreAssortmentPriceInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(storeID) == "" || strings.TrimSpace(masterProductID) == "" {
		s.writeCatalogMutationError(w, centralcatalog.ErrInvalid)
		return
	}

	price, err := centralcatalog.ScheduleAssortmentPriceAtomic(r.Context(), s.db, storeID, masterProductID, actorID, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"priceSchedule": price})
}
