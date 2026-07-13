package http

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/fieldreadiness"
	"dsh-api/internal/media"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

const maxMediaUploadBytes = 15 << 20 // 15MB

// POST /dsh/field/media/uploads — field agent uploads a binary document/photo
// and receives back a mediaRef to attach via POST /dsh/field/partners/{id}/documents.
func (s *protectedStoreServer) handleFieldMediaUpload(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	if s.media == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}

	if err := r.ParseMultipartForm(maxMediaUploadBytes); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart upload or file too large")
		return
	}
	partnerID := r.FormValue("partnerId")
	storeID := r.FormValue("storeId")
	purpose := "partner_document"
	if partnerID == "" && storeID == "" {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "partnerId or storeId is required")
		return
	}
	if partnerID != "" {
		p, err := partner.GetPartner(s.db, partnerID)
		if errors.Is(err, partner.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify partner ownership")
			return
		}
		if p.CreatedByActorID != actor.ID {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this partner draft does not belong to you")
			return
		}
	} else {
		if err := fieldreadiness.AuthorizeStore(r.Context(), s.db, actor, storeID); err != nil {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
			return
		}
		var linkedPartner sql.NullString
		if err := s.db.QueryRowContext(r.Context(), `SELECT partner_id FROM dsh_stores WHERE id = $1`, storeID).Scan(&linkedPartner); err != nil {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
			return
		}
		if !linkedPartner.Valid || linkedPartner.String == "" {
			store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "store has no linked partner")
			return
		}
		partnerID = linkedPartner.String
		purpose = "field_readiness_evidence"
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file field is required")
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey("dsh-partner-documents", "objects", opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))

	if err := s.media.Upload(r.Context(), key, file, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload media")
		return
	}
	mediaRef, err := s.createMediaReference(r.Context(), key, actor, partnerID, purpose, contentType, header.Filename)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register media reference")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]string{"mediaRef": mediaRef})
}

// GET /dsh/media?mediaRef=... streams back an authorized uploaded object
// so control-panel/app-partner can preview evidence during document review.
func (s *protectedStoreServer) handleMediaDownload(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field", "partner", "operator")
	if !ok {
		return
	}
	if s.media == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	mediaRef := r.URL.Query().Get("mediaRef")
	if mediaRef == "" {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "mediaRef is required")
		return
	}
	ref, err := s.loadMediaReference(r.Context(), mediaRef)
	if errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "media not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load media reference")
		return
	}
	allowed, err := s.actorCanAccessMediaReference(r.Context(), actor, ref)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize media reference")
		return
	}
	if !allowed {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this media reference")
		return
	}
	reader, contentType, err := s.media.Get(r.Context(), ref.StorageKey)
	if err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "media not found")
		return
	}
	defer reader.Close()
	w.Header().Set("Content-Type", contentType)
	_, _ = io.Copy(w, reader)
}

type mediaReference struct {
	MediaRef       string
	StorageKey     string
	OwnerActorID   string
	OwnerActorRole string
	PartnerID      string
}

func (s *protectedStoreServer) createMediaReference(
	ctx context.Context,
	storageKey string,
	actor store.StoreActor,
	partnerID string,
	purpose string,
	contentType string,
	fileName string,
) (string, error) {
	var storeID sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT id
		FROM dsh_stores
		WHERE partner_id = $1
		ORDER BY created_at ASC
		LIMIT 1`, partnerID).Scan(&storeID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	var mediaRef string
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, partner_id, store_id, purpose, content_type, original_filename)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING media_ref`,
		storageKey, actor.ID, actor.Role, partnerID, storeID, purpose, contentType, fileName,
	).Scan(&mediaRef)
	return mediaRef, err
}

func (s *protectedStoreServer) loadMediaReference(ctx context.Context, mediaRef string) (mediaReference, error) {
	var ref mediaReference
	var partnerID sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id
		FROM dsh_media_refs
		WHERE media_ref = $1`, mediaRef).Scan(
		&ref.MediaRef,
		&ref.StorageKey,
		&ref.OwnerActorID,
		&ref.OwnerActorRole,
		&partnerID,
	)
	ref.PartnerID = partnerID.String
	return ref, err
}

func (s *protectedStoreServer) actorCanAccessMediaReference(ctx context.Context, actor store.StoreActor, ref mediaReference) (bool, error) {
	switch actor.Role {
	case "operator":
		return true, nil
	case "field":
		return ref.OwnerActorID == actor.ID && ref.OwnerActorRole == "field", nil
	case "captain":
		return ref.OwnerActorID == actor.ID && ref.OwnerActorRole == "captain", nil
	case "partner":
		if ref.PartnerID == "" {
			return false, nil
		}
		var allowed bool
		err := s.db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1
				FROM dsh_store_actor_scopes scopes
				JOIN dsh_stores stores ON stores.id = scopes.store_id
				WHERE scopes.actor_id = $1
				  AND scopes.actor_role = 'partner'
				  AND scopes.active = true
				  AND stores.partner_id = $2
			)`, actor.ID, ref.PartnerID).Scan(&allowed)
		return allowed, err
	default:
		return false, nil
	}
}

// POST /dsh/operator/workforce/media/uploads — an HR operator uploads a
// provider-owned document (captain license/vehicle photo, field agent
// document) while creating or editing a Workforce profile. Unlike
// handleFieldMediaUpload, this is not tied to any dsh_partners row.
func (s *protectedStoreServer) handleProviderMediaUpload(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", "provider.documents:upload", "operator")
	if !ok {
		return
	}
	if s.media == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	if err := r.ParseMultipartForm(maxMediaUploadBytes); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart upload or file too large")
		return
	}
	actorID := r.FormValue("actorId")
	actorRole := r.FormValue("actorRole")
	if actorID == "" || (actorRole != "field" && actorRole != "captain") {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "actorId and actorRole (field|captain) are required")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file field is required")
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey("dsh-provider-documents", "objects", opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))

	if err := s.media.Upload(r.Context(), key, file, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload media")
		return
	}
	var mediaRef string
	err = s.db.QueryRowContext(r.Context(), `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, purpose, content_type, original_filename)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING media_ref`,
		key, actorID, actorRole, "provider_document", contentType, header.Filename,
	).Scan(&mediaRef)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register media reference")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]string{"mediaRef": mediaRef})
}
