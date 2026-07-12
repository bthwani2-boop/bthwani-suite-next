package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/catalog"
	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// Legacy catalog-submission permission actions on the control-panel
// surface. "operator" remains a valid fallback role during RBAC data
// migration.
const (
	CatalogPermissionSubmissionRead   = "catalog.submission.read"
	CatalogPermissionSubmissionDecide = "catalog.submission.decide"
)

// handlePublicCatalog is the sole client-facing catalog read. Per
// governance/catalog/CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md rule 4, it reads
// only from the master catalog + store assortment -- never from the legacy
// per-store dsh_catalog_categories/dsh_catalog_products tables -- so a
// product is visible to app-client only when domain, master product, and
// assortment row are all independently approved/active/visible.
func handlePublicCatalog(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		domains, nodes, products, media, policySnapshot, err := centralcatalog.GetClientCatalog(r.Context(), db, r.PathValue("storeId"))
		if errors.Is(err, centralcatalog.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "approved catalog not found")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "catalog unavailable")
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{
			"domains":        domains,
			"nodes":          nodes,
			"products":       products,
			"media":          media,
			"policySnapshot": policySnapshot,
		})
	}
}

// legacyCatalogWriteBlocked enforces rule 8 of the sovereignty decision: the
// per-store dsh_catalog_categories/dsh_catalog_products tables become
// legacy-read-only as of dsh-030. No surface may create or update a local
// category/product as ground truth anymore -- use POST
// /dsh/partner/catalog/product-proposals (or the field equivalent) to request
// a master-catalog addition instead.
func legacyCatalogWriteBlocked(w http.ResponseWriter) {
	store.SendError(w, http.StatusGone, "LEGACY_CATALOG_WRITE_BLOCKED",
		"local categories/products are no longer writable; submit a product proposal against the central catalog instead")
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

// fieldPartnerStore resolves the store owned by the partner draft at
// {partnerId} in the URL, requiring the calling field actor to be the one
// who created that partner draft, and requiring the partner to already have
// a linked store (every partner gets one automatically on creation).
func (s *protectedStoreServer) fieldPartnerStore(w http.ResponseWriter, r *http.Request) (actorID, storeID string, ok bool) {
	actor, reqOk := s.requireActor(w, r, "field")
	if !reqOk {
		return "", "", false
	}
	partnerID := r.PathValue("partnerId")
	p, err := partner.GetPartner(s.db, partnerID)
	if errors.Is(err, partner.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
		return "", "", false
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify partner ownership")
		return "", "", false
	}
	if p.CreatedByActorID != actor.ID {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this partner draft does not belong to you")
		return "", "", false
	}
	row, err := store.GetStoreByPartnerID(s.db, partnerID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner store")
		return "", "", false
	}
	if row == nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner has no linked store yet")
		return "", "", false
	}
	return actor.ID, row.ID, true
}

// GET /dsh/field/partners/{partnerId}/store
func (s *protectedStoreServer) handleFieldGetPartnerStore(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	row, err := store.GetStoreByPartnerID(s.db, r.PathValue("partnerId"))
	if err != nil || row == nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load store")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"storeId": storeID, "store": store.RowToFieldPartnerStoreDraft(*row)})
}

// PATCH /dsh/field/partners/{partnerId}/store
func (s *protectedStoreServer) handleFieldUpdatePartnerStore(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	var input store.FieldStoreDraftInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	row, audit, err := store.UpdateFieldStoreDraft(r.Context(), s.db, storeID, actorID, correlationID(r), input)
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"storeId": storeID, "store": row, "audit": audit})
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

// handlePartnerCategoryCreate, handlePartnerCategoryUpdate,
// handlePartnerCategoryDelete, handlePartnerProductCreate,
// handlePartnerProductUpdate and handlePartnerProductDelete are
// legacy-read-only as of dsh-030 (governance/catalog/
// CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md rule 8): a store can no longer
// originate a category or product as ground truth. Use POST
// /dsh/partner/catalog/product-proposals to request a central-catalog
// addition, and PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}
// to manage price/availability/stock/note/local-image for an existing
// master product.
func (s *protectedStoreServer) handlePartnerCategoryCreate(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := s.partnerStore(w, r); !ok {
		return
	}
	legacyCatalogWriteBlocked(w)
}

func (s *protectedStoreServer) handlePartnerCategoryUpdate(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := s.partnerStore(w, r); !ok {
		return
	}
	legacyCatalogWriteBlocked(w)
}

func (s *protectedStoreServer) handlePartnerCategoryDelete(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := s.partnerStore(w, r); !ok {
		return
	}
	legacyCatalogWriteBlocked(w)
}

func (s *protectedStoreServer) handlePartnerProductCreate(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := s.partnerStore(w, r); !ok {
		return
	}
	legacyCatalogWriteBlocked(w)
}

func (s *protectedStoreServer) handlePartnerProductUpdate(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := s.partnerStore(w, r); !ok {
		return
	}
	legacyCatalogWriteBlocked(w)
}

func (s *protectedStoreServer) handlePartnerProductDelete(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := s.partnerStore(w, r); !ok {
		return
	}
	legacyCatalogWriteBlocked(w)
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
	if _, ok := s.requirePermission(w, r, "control-panel", CatalogPermissionSubmissionRead, "operator"); !ok {
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
	actor, ok := s.requirePermission(w, r, "control-panel", CatalogPermissionSubmissionDecide, "operator")
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
	if _, ok := s.requirePermission(w, r, "control-panel", CatalogPermissionSubmissionRead, "operator"); !ok {
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
