package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// handlePublicCatalog is the sole client-facing catalog read. Per
// governance/catalog/CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md rule 4, it reads
// only from the master catalog + store assortment, so a
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

func correlationID(r *http.Request) string {
	value := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(value) < 8 {
		return "corr-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	return value
}
