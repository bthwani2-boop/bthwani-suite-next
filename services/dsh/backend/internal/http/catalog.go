package http

import (
	"database/sql"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/media"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// handlePublicCatalog is the sole client-facing catalog read. Per
// governance/catalog/CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md rule 4, it reads
// only from the master catalog + store assortment, then applies the same
// normalized price/inventory authority used by cart. A product cannot be
// advertised to app-client unless it is actually purchasable now, and every
// returned taxonomy/media/policy projection is pruned to that exact final
// product set.
func handlePublicCatalog(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		domains, nodes, products, catalogMedia, policySnapshot, err := centralcatalog.GetPurchasableClientCatalog(r.Context(), db, r.PathValue("storeId"))
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
			"media":          catalogMedia,
			"policySnapshot": policySnapshot,
		})
	}
}

// handlePublicMedia serves the binary for an approved DAM asset with no
// authentication -- this is the counterpart to handlePublicCatalog for
// images: app-client (and any other unauthenticated surface) can render
// catalog media directly from the publicUrl the catalog response gives it,
// without needing a bearer session the way the private-document
// /dsh/media?mediaRef= path requires. The {variant} path segment is accepted
// for forward-compatibility with resized/converted renditions but only
// "original" is served today.
func handlePublicMedia(db *sql.DB, mediaProvider *media.Provider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var mediaClient *media.Client
		if mediaProvider != nil {
			mediaClient = mediaProvider.Client()
		}
		if mediaClient == nil {
			store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
			return
		}
		asset, err := centralcatalog.GetApprovedAsset(r.Context(), db, r.PathValue("assetId"))
		if errors.Is(err, centralcatalog.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "media not found")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load media asset")
			return
		}

		if localMediaDir := os.Getenv("DSH_LOCAL_MEDIA_PATH"); localMediaDir != "" {
			localPath := filepath.Join(localMediaDir, asset.ObjectKey)
			if stat, err := os.Stat(localPath); err == nil && !stat.IsDir() {
				http.ServeFile(w, r, localPath)
				return
			}
		}

		signedURL, _, err := mediaClient.PresignGet(r.Context(), asset.ObjectKey, 2*time.Hour)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to generate preview url")
			return
		}
		http.Redirect(w, r, signedURL, http.StatusFound)
	}
}

func (s *protectedStoreServer) partnerStore(w http.ResponseWriter, r *http.Request) (store.StoreActor, string, bool) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return store.StoreActor{}, "", false
	}
	requestedStoreID := strings.TrimSpace(r.PathValue("storeId"))
	if requestedStoreID == "" {
		requestedStoreID = strings.TrimSpace(r.URL.Query().Get("storeId"))
	}
	row, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, requestedStoreID)
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
func (s *protectedStoreServer) fieldPartnerStore(w http.ResponseWriter, r *http.Request) (actor store.StoreActor, storeID string, ok bool) {
	actor, reqOk := s.requireActor(w, r, "field")
	if !reqOk {
		return store.StoreActor{}, "", false
	}
	operatorContextID := strings.TrimSpace(actor.OperatorContextID)
	if operatorContextID == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return store.StoreActor{}, "", false
	}
	partnerID := r.PathValue("partnerId")
	p, err := partner.GetPartnerForOperatorContext(s.db, operatorContextID, partnerID)
	if errors.Is(err, partner.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
		return store.StoreActor{}, "", false
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify partner ownership")
		return store.StoreActor{}, "", false
	}
	if p.CreatedByActorID != actor.ID {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this partner draft does not belong to you")
		return store.StoreActor{}, "", false
	}
	row, err := store.GetPartnerFirstStoreForOperatorContext(r.Context(), s.db, operatorContextID, partnerID)
	if errors.Is(err, store.ErrFirstStoreReferenceMissing) {
		store.SendError(w, http.StatusConflict, "PARTNER_FIRST_STORE_REFERENCE_REQUIRED", "the first-store reference is not uniquely governed")
		return store.StoreActor{}, "", false
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner store")
		return store.StoreActor{}, "", false
	}
	if row == nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner has no linked store yet")
		return store.StoreActor{}, "", false
	}
	return actor, row.ID, true
}

// GET /dsh/field/partners/{partnerId}/store
func (s *protectedStoreServer) handleFieldGetPartnerStore(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	row, err := store.GetStoreByIDInternalForOperatorContext(r.Context(), s.db, actor.OperatorContextID, storeID)
	if err != nil || row == nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load store")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"storeId": storeID, "store": store.RowToFieldPartnerStoreDraft(*row)})
}

// PATCH /dsh/field/partners/{partnerId}/store
func (s *protectedStoreServer) handleFieldUpdatePartnerStore(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	var input store.FieldStoreDraftInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required")
		return
	}

	row, audit, err := store.UpdateFieldStoreDraft(r.Context(), s.db, storeID, actor.ID, idempotencyKey, correlationID(r), input)
	if errors.Is(err, store.ErrIdempotencyConflict) {
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different store draft update request")
		return
	}
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
