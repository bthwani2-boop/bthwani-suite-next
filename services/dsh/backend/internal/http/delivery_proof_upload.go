package http

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/media"
	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

func isMultipartRequest(r *http.Request) bool {
	return strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "multipart/form-data")
}

func (s *protectedStoreServer) uploadDeliveryProofObject(
	w http.ResponseWriter,
	r *http.Request,
	namespace string,
	ownerID string,
) (mediaRef string, storageKey string, ok bool) {
	mediaClient := s.mediaClient()
	if mediaClient == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return "", "", false
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxMediaUploadBytes+mediaUploadMultipartOverheadBytes)
	if err := r.ParseMultipartForm(maxMediaUploadBytes); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart upload or file too large")
		return "", "", false
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file field is required")
		return "", "", false
	}
	defer file.Close()

	uploadBody, contentType, err := prepareMediaUploadBody(file, header.Header.Get("Content-Type"))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "unsupported delivery proof media type")
		return "", "", false
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey(namespace, ownerID, opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))
	if err := mediaClient.Upload(r.Context(), key, uploadBody, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload delivery proof")
		return "", "", false
	}
	return contentType + "\x00" + header.Filename, key, true
}

func (s *protectedStoreServer) removeDeliveryProofObject(r *http.Request, mediaRef, storageKey string) {
	if mediaRef != "" {
		_, _ = s.db.ExecContext(r.Context(), `DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef)
	}
	if client := s.mediaClient(); client != nil && storageKey != "" {
		_ = client.Remove(r.Context(), storageKey)
	}
}

// handleSubmitDispatchPoDWithMedia keeps the existing JSON PoD contract while
// adding a production-shaped multipart path for the captain surface. Multipart
// submissions upload the binary first, register a governed mediaRef owned by
// the authenticated captain, then complete the delivery with that reference.
func (s *protectedStoreServer) handleSubmitDispatchPoDWithMedia(w http.ResponseWriter, r *http.Request) {
	if !isMultipartRequest(r) {
		s.handleSubmitDispatchPoD(w, r)
		return
	}

	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	assignmentID := strings.TrimSpace(r.PathValue("assignmentId"))
	if assignmentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "assignmentId is required")
		return
	}

	var eligible bool
	if err := s.db.QueryRowContext(r.Context(), `
		SELECT EXISTS (
			SELECT 1
			FROM dsh_assignments a
			JOIN dsh_deliveries d ON d.assignment_id = a.id
			WHERE a.id = $1::uuid
			  AND a.captain_id = $2
			  AND a.status = 'accepted'
			  AND d.status = 'arrived_customer'
		)`, assignmentID, actor.ID).Scan(&eligible); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify delivery proof ownership")
		return
	}
	if !eligible {
		store.SendError(w, http.StatusConflict, "DISPATCH_STATE_CONFLICT", "proof upload requires the authenticated captain at arrived_customer state")
		return
	}

	metadata, key, uploaded := s.uploadDeliveryProofObject(w, r, "dsh-delivery-proofs", actor.ID)
	if !uploaded {
		return
	}
	parts := strings.SplitN(metadata, "\x00", 2)
	contentType, fileName := parts[0], ""
	if len(parts) == 2 {
		fileName = parts[1]
	}

	var mediaRef string
	if err := s.db.QueryRowContext(r.Context(), `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, purpose, content_type, original_filename)
		VALUES ($1,$2,'captain','delivery_proof',$3,$4)
		RETURNING media_ref`, key, actor.ID, contentType, fileName).Scan(&mediaRef); err != nil {
		s.removeDeliveryProofObject(r, "", key)
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register delivery proof")
		return
	}

	assignment, err := dispatch.SubmitPoD(s.db, assignmentID, actor.ID, dispatch.PoDInput{
		Method:    "photo",
		Reference: mediaRef,
	})
	if err != nil {
		s.removeDeliveryProofObject(r, mediaRef, key)
	}
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// handlePartnerDeliveryProofWithMedia extends the existing partner proof
// operation with multipart upload while retaining JSON compatibility. The
// authenticated partner must own the order's store, and the task must already
// be at the customer before the binary is accepted.
func (s *protectedStoreServer) handlePartnerDeliveryProofWithMedia(w http.ResponseWriter, r *http.Request) {
	if !isMultipartRequest(r) {
		s.handlePartnerDeliveryProof(w, r)
		return
	}

	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	task, err := partnerdelivery.GetByOrderID(s.db, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	if task.Status != partnerdelivery.StatusArrived && task.Status != partnerdelivery.StatusProofPending {
		store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_DELIVERY_INVALID_TRANSITION", "proof upload requires arrived or proof_pending state")
		return
	}

	var partnerID string
	if err := s.db.QueryRowContext(r.Context(), `SELECT partner_id FROM dsh_stores WHERE id = $1`, task.StoreID).Scan(&partnerID); err != nil || partnerID == "" {
		store.SendError(w, http.StatusConflict, "PARTNER_DELIVERY_STORE_UNOWNED", "delivery store has no partner owner")
		return
	}

	metadata, key, uploaded := s.uploadDeliveryProofObject(w, r, "dsh-partner-delivery-proofs", actor.ID)
	if !uploaded {
		return
	}
	parts := strings.SplitN(metadata, "\x00", 2)
	contentType, fileName := parts[0], ""
	if len(parts) == 2 {
		fileName = parts[1]
	}

	var mediaRef string
	if err := s.db.QueryRowContext(r.Context(), `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, partner_id, store_id, purpose, content_type, original_filename)
		VALUES ($1,$2,'partner',$3,$4,'partner_delivery_proof',$5,$6)
		RETURNING media_ref`, key, actor.ID, partnerID, task.StoreID, contentType, fileName).Scan(&mediaRef); err != nil {
		s.removeDeliveryProofObject(r, "", key)
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register partner delivery proof")
		return
	}

	svc := partnerdelivery.NewService(s.db)
	updated, err := svc.SubmitProof(
		r.Context(),
		task.ID,
		task.Version,
		"photo",
		mediaRef,
		actor.ID,
		actor.Role,
		partnerDeliveryCorrelationID(r, ""),
	)
	if err != nil {
		s.removeDeliveryProofObject(r, mediaRef, key)
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
}
