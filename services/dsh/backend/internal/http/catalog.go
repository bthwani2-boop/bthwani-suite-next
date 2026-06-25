package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/catalog"
	"dsh-api/internal/store"
)

func handlePublicCatalog(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categories, products, err := catalog.PublicCatalog(r.Context(), db, r.PathValue("storeId"))
		if errors.Is(err, catalog.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "approved catalog not found")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "catalog unavailable")
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"categories": categories, "products": products})
	}
}

func (s *protectedStoreServer) partnerStore(w http.ResponseWriter, r *http.Request) (store.StoreActor, string, bool) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return store.StoreActor{}, "", false
	}
	row, _, err := store.ResolveActorStore(r.Context(), s.db, actor)
	if err != nil {
		s.writeStoreError(w, err)
		return store.StoreActor{}, "", false
	}
	return actor, row.ID, true
}

func (s *protectedStoreServer) handlePartnerCatalog(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	categories, err := catalog.ListCategories(r.Context(), s.db, storeID, false)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	products, err := catalog.ListProducts(r.Context(), s.db, storeID, false)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"storeId": storeID, "categories": categories, "products": products})
}

func (s *protectedStoreServer) handlePartnerCategoryCreate(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input catalog.CategoryInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := catalog.UpsertCategory(r.Context(), s.db, actor.ID, actor.Role, storeID, "", correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"category": item})
}

func (s *protectedStoreServer) handlePartnerCategoryUpdate(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input catalog.CategoryInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := catalog.UpsertCategory(r.Context(), s.db, actor.ID, actor.Role, storeID, r.PathValue("categoryId"), correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"category": item})
}

func (s *protectedStoreServer) handlePartnerCategoryDelete(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	err := catalog.DeleteCategory(r.Context(), s.db, actor.ID, actor.Role, storeID, r.PathValue("categoryId"), correlationID(r), expectedVersion(r))
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handlePartnerProductCreate(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input catalog.ProductInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := catalog.UpsertProduct(r.Context(), s.db, actor.ID, actor.Role, storeID, "", correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"product": item})
}

func (s *protectedStoreServer) handlePartnerProductUpdate(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input catalog.ProductInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := catalog.UpsertProduct(r.Context(), s.db, actor.ID, actor.Role, storeID, r.PathValue("productId"), correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"product": item})
}

func (s *protectedStoreServer) handlePartnerProductDelete(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	err := catalog.DeleteProduct(r.Context(), s.db, actor.ID, actor.Role, storeID, r.PathValue("productId"), correlationID(r), expectedVersion(r))
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleUploadIntent(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input catalog.UploadIntentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, uploadURL, err := catalog.CreateUploadIntent(r.Context(), s.db, actor.ID, actor.Role, storeID, correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"media": item, "uploadUrl": uploadURL, "method": "PUT"})
}

func (s *protectedStoreServer) handleCompleteMedia(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input catalog.CompleteMediaInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := catalog.CompleteMedia(r.Context(), s.db, actor.ID, actor.Role, storeID, r.PathValue("mediaId"), correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"media": item})
}

func (s *protectedStoreServer) handleDeleteMedia(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	err := catalog.DeleteMedia(r.Context(), s.db, actor.ID, actor.Role, storeID, r.PathValue("mediaId"), correlationID(r), expectedVersion(r))
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleSubmitCatalog(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	item, err := catalog.Submit(r.Context(), s.db, actor.ID, storeID, correlationID(r))
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"revision": item})
}

func (s *protectedStoreServer) handleCatalogSubmissions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	items, err := catalog.ListSubmissions(r.Context(), s.db)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"submissions": items})
}

func (s *protectedStoreServer) handleCatalogDecision(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var input catalog.DecisionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := catalog.Decide(r.Context(), s.db, actor.ID, r.PathValue("storeId"), correlationID(r), input)
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"revision": item})
}

func (s *protectedStoreServer) handleCatalogAudit(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	items, err := catalog.ListAudit(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": items})
}

func (s *protectedStoreServer) writeCatalogError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, catalog.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, catalog.ErrConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", err.Error())
	case errors.Is(err, catalog.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "catalog operation failed")
	}
}

func correlationID(r *http.Request) string {
	value := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(value) < 8 {
		return "corr-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	return value
}

func expectedVersion(r *http.Request) int {
	value, _ := strconv.Atoi(r.URL.Query().Get("expectedVersion"))
	return value
}
