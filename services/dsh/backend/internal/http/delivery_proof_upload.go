package http

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/media"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

// handleSubmitDispatchPoDWithMedia keeps the existing JSON PoD contract while
// adding a production-shaped multipart path for the captain surface. Multipart
// submissions upload the binary first, register a governed mediaRef owned by
// the authenticated captain, then complete the delivery with that reference.
func (s *protectedStoreServer) handleSubmitDispatchPoDWithMedia(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(strings.ToLower(r.Header.Get("Content-Type")), "multipart/form-data") {
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

	mediaClient := s.mediaClient()
	if mediaClient == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxMediaUploadBytes+mediaUploadMultipartOverheadBytes)
	if err := r.ParseMultipartForm(maxMediaUploadBytes); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart upload or file too large")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file field is required")
		return
	}
	defer file.Close()

	uploadBody, contentType, err := prepareMediaUploadBody(file, header.Header.Get("Content-Type"))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "unsupported delivery proof media type")
		return
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey("dsh-delivery-proofs", actor.ID, opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))
	if err := mediaClient.Upload(r.Context(), key, uploadBody, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload delivery proof")
		return
	}

	var mediaRef string
	if err := s.db.QueryRowContext(r.Context(), `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, purpose, content_type, original_filename)
		VALUES ($1,$2,'captain','delivery_proof',$3,$4)
		RETURNING media_ref`, key, actor.ID, contentType, header.Filename).Scan(&mediaRef); err != nil {
		_ = mediaClient.Remove(r.Context(), key)
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register delivery proof")
		return
	}

	assignment, err := dispatch.SubmitPoD(s.db, assignmentID, actor.ID, dispatch.PoDInput{
		Method:    "photo",
		Reference: mediaRef,
	})
	if err != nil {
		_, _ = s.db.ExecContext(r.Context(), `DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef)
		_ = mediaClient.Remove(r.Context(), key)
	}
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}
