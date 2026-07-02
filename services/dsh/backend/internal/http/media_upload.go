package http

import (
	"fmt"
	"io"
	"net/http"
	"time"

	"dsh-api/internal/media"
	"dsh-api/internal/store"
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
	if partnerID == "" {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "partnerId is required")
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
	key := media.BuildKey("dsh-partner-documents", actor.ID, partnerID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))

	if err := s.media.Upload(r.Context(), key, file, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload media")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]string{"mediaRef": key})
}

// GET /dsh/media/{mediaRef...} — streams back a previously uploaded object
// so control-panel/app-partner can preview evidence during document review.
func (s *protectedStoreServer) handleMediaDownload(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field", "partner", "operator", "captain")
	if !ok {
		return
	}
	if s.media == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	key := r.PathValue("mediaRef")
	if key == "" {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "mediaRef is required")
		return
	}
	reader, contentType, err := s.media.Get(r.Context(), key)
	if err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "media not found")
		return
	}
	defer reader.Close()
	w.Header().Set("Content-Type", contentType)
	_, _ = io.Copy(w, reader)
}
