package http

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"

	"github.com/google/uuid"
)

func RegisterWorkforceEmployeeMediaRoute(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("POST /dsh/operator/workforce/employees/{actorId}/media/uploads", protected.handleEmployeeMediaUpload)
}

func (s *protectedStoreServer) handleEmployeeMediaUpload(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", "provider.documents:upload", "operator")
	if !ok {
		return
	}
	mediaClient := s.mediaClient()
	if mediaClient == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	if actorID == "" {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "actorId is required")
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
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "unsupported media type")
		return
	}
	opaqueID := strings.ReplaceAll(uuid.NewString(), "-", "")
	key := media.BuildKey("dsh-employee-documents", "objects", opaqueID, fmt.Sprintf("%d-%s", time.Now().UnixNano(), header.Filename))
	if err := mediaClient.Upload(r.Context(), key, uploadBody, header.Size, contentType); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upload employee media")
		return
	}

	var mediaRef string
	err = s.db.QueryRowContext(r.Context(), `
		INSERT INTO dsh_media_refs
			(storage_key, owner_actor_id, owner_actor_role, purpose, content_type, original_filename)
		VALUES ($1,$2,'employee','employee_document',$3,$4)
		RETURNING media_ref`,
		key, actorID, contentType, header.Filename,
	).Scan(&mediaRef)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register employee media reference")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]string{"mediaRef": mediaRef})
}
