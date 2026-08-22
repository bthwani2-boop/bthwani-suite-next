package http

import (
	"database/sql"
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

type providerMediaValidationRequest struct {
	ActorID   string `json:"actorId"`
	ActorRole string `json:"actorRole"`
	MediaRef  string `json:"mediaRef"`
}

// handleValidateProviderDocumentMedia is the DSH-owned authority for linking
// provider documents into Workforce profiles. Workforce never validates an
// opaque reference locally because that would create a second media truth.
func handleValidateProviderDocumentMedia(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !store.RequireServiceCaller(w, r, "DSH_WORKFORCE_SERVICE_TOKEN", "workforce") {
			return
		}
		if strings.TrimSpace(r.Header.Get("X-Operator-Context-ID")) == "" {
			store.SendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "trusted operator context is required")
			return
		}
		var input providerMediaValidationRequest
		if !decodeProtectedJSON(w, r, &input) {
			return
		}
		input.ActorID = strings.TrimSpace(input.ActorID)
		input.ActorRole = strings.TrimSpace(input.ActorRole)
		input.MediaRef = strings.TrimSpace(input.MediaRef)
		if input.ActorID == "" || input.MediaRef == "" || !validProviderMediaRole(input.ActorRole) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId, actorRole, and mediaRef are required")
			return
		}
		if db == nil {
			store.SendError(w, http.StatusServiceUnavailable, "DSH_UNAVAILABLE", "media authority is unavailable")
			return
		}

		var exists bool
		err := db.QueryRowContext(r.Context(), `
			SELECT EXISTS (
				SELECT 1
				FROM dsh_media_refs
				WHERE media_ref = $1
				  AND owner_actor_id = $2
				  AND owner_actor_role = $3
				  AND partner_id IS NULL
				  AND purpose = 'provider_document'
				  AND scan_status = 'clean'
			)`, input.MediaRef, input.ActorID, input.ActorRole).Scan(&exists)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to validate media reference")
			return
		}
		if !exists {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "provider media reference is not valid")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func validProviderMediaRole(role string) bool {
	switch role {
	case "field", "captain", "employee":
		return true
	default:
		return false
	}
}
