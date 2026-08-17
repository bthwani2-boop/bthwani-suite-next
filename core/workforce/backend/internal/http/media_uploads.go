package http

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"workforce-api/internal/auth"
	"workforce-api/internal/media"

	"github.com/google/uuid"
)

const maxMediaUploadBytes = 10 << 20 // 10 MB
const mediaUploadMultipartOverheadBytes = 1024 * 1024

func (s *server) handleMediaUpload(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	if _, ok := auth.OperatorContextIDFromContext(r.Context()); !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "trusted operator context is required")
		return
	}

	mediaProvider := s.mediaClient()
	if mediaProvider == nil || !mediaProvider.Ready(r.Context()) {
		sendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	mediaClient := mediaProvider.Client()
	if mediaClient == nil {
		sendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage client is nil")
		return
	}

	actorID := strings.TrimSpace(r.PathValue("actorId"))
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "actorId is required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxMediaUploadBytes+mediaUploadMultipartOverheadBytes)
	if err := r.ParseMultipartForm(maxMediaUploadBytes); err != nil {
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart upload or file too large")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file field is required")
		return
	}
	defer file.Close()

	uploadBody, contentType, err := prepareMediaUploadBody(file, header.Header.Get("Content-Type"))
	if err != nil {
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "unsupported media type")
		return
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey("workforce-provider-documents", "objects", opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))
	if err := mediaClient.Upload(r.Context(), key, uploadBody, header.Size, contentType); err != nil {
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload media")
		return
	}

	var mediaRef string
	err = s.db.QueryRowContext(r.Context(), `
		INSERT INTO workforce_media_refs
			(storage_key, owner_actor_id, owner_actor_role, purpose, content_type, original_filename)
		VALUES ($1,$2,'provider','provider_document',$3,$4)
		RETURNING media_ref`,
		key, actorID, contentType, header.Filename,
	).Scan(&mediaRef)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register media reference")
		return
	}
	sendJSON(w, http.StatusCreated, map[string]string{"mediaRef": mediaRef})
}

func (s *server) mediaClient() *media.Provider {
	return s.media
}

func prepareMediaUploadBody(file io.Reader, declaredContentType string) (io.Reader, string, error) {
	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return nil, "", err
	}
	head = head[:n]

	detectedContentType := http.DetectContentType(head)
	if !isAllowedMediaUploadContentType(detectedContentType, declaredContentType) {
		return nil, "", fmt.Errorf("unsupported media content type: %s", detectedContentType)
	}
	return io.MultiReader(bytes.NewReader(head), file), detectedContentType, nil
}

func isAllowedMediaUploadContentType(detectedContentType, declaredContentType string) bool {
	detected := normalizeMediaContentType(detectedContentType)
	declared := normalizeMediaContentType(declaredContentType)
	if isExplicitlyRejectedMediaContentType(detected) || isExplicitlyRejectedMediaContentType(declared) {
		return false
	}
	switch detected {
	case "image/jpeg", "image/png", "image/webp", "application/pdf":
		return true
	default:
		return false
	}
}

func normalizeMediaContentType(contentType string) string {
	contentType = strings.TrimSpace(strings.ToLower(contentType))
	if i := strings.IndexByte(contentType, ';'); i >= 0 {
		contentType = strings.TrimSpace(contentType[:i])
	}
	return contentType
}

func isExplicitlyRejectedMediaContentType(contentType string) bool {
	return contentType == "image/svg+xml" || contentType == "text/html" || strings.HasPrefix(contentType, "video/")
}
