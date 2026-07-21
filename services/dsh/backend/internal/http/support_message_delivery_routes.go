package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/support"
	"dsh-api/internal/wlt"
)

func decodeSupportAttachmentInput(w http.ResponseWriter, r *http.Request) (support.MessageAttachmentInput, bool) {
	var body struct {
		MediaAssetID string `json:"mediaAssetId"`
		FileName     string `json:"fileName"`
		MimeType     string `json:"mimeType"`
		SizeBytes    int64  `json:"sizeBytes"`
		IsInternal   bool   `json:"isInternal"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return support.MessageAttachmentInput{}, false
	}
	return support.MessageAttachmentInput{
		MediaAssetID: body.MediaAssetID,
		FileName: body.FileName,
		MimeType: body.MimeType,
		SizeBytes: body.SizeBytes,
		IsInternal: body.IsInternal,
	}, true
}

func (s *protectedStoreServer) handleAttachActorSupportMessageAsset(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot attach support media")
		return
	}
	input, ok := decodeSupportAttachmentInput(w, r)
	if !ok {
		return
	}
	attachment, err := support.AttachActorMessageAsset(
		s.db, actor.ID, role, r.PathValue("ticketId"), r.PathValue("messageId"), input,
	)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to attach support media")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"attachment": attachment})
}

func (s *protectedStoreServer) handleListActorSupportMessageAttachments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot read support media")
		return
	}
	items, err := support.ListActorMessageAttachments(
		s.db, actor.ID, role, r.PathValue("ticketId"), r.PathValue("messageId"),
	)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list support media")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"attachments": items})
}

func (s *protectedStoreServer) handleMarkActorSupportMessagesRead(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot update support receipts")
		return
	}
	summary, err := support.MarkActorTicketMessagesRead(s.db, actor.ID, role, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to mark support messages read")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"receipt": summary})
}

func (s *protectedStoreServer) handleAttachOperatorSupportMessageAsset(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	input, ok := decodeSupportAttachmentInput(w, r)
	if !ok {
		return
	}
	attachment, err := support.AttachOperatorMessageAsset(
		s.db, actor.ID, r.PathValue("ticketId"), r.PathValue("messageId"), input,
	)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to attach operator support media")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"attachment": attachment})
}

func (s *protectedStoreServer) handleListOperatorSupportMessageAttachments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	items, err := support.ListOperatorMessageAttachments(
		s.db, actor.ID, r.PathValue("ticketId"), r.PathValue("messageId"),
	)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list operator support media")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"attachments": items})
}

func (s *protectedStoreServer) handleMarkOperatorSupportMessagesRead(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	summary, err := support.MarkOperatorTicketMessagesRead(s.db, actor.ID, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to mark operator support messages read")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"receipt": summary})
}

// RegisterSupportMessageDeliveryRoutes closes JRN-021 attachments and read-state
// behavior for actor conversations and the operator support surface.
func RegisterSupportMessageDeliveryRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)

	mux.HandleFunc("POST /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments", protected.handleAttachActorSupportMessageAsset)
	mux.HandleFunc("GET /dsh/support/tickets/{ticketId}/messages/{messageId}/attachments", protected.handleListActorSupportMessageAttachments)
	mux.HandleFunc("POST /dsh/support/tickets/{ticketId}/messages/read", protected.handleMarkActorSupportMessagesRead)

	mux.HandleFunc("POST /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments", protected.handleAttachOperatorSupportMessageAsset)
	mux.HandleFunc("GET /dsh/operator/support/tickets/{ticketId}/messages/{messageId}/attachments", protected.handleListOperatorSupportMessageAttachments)
	mux.HandleFunc("POST /dsh/operator/support/tickets/{ticketId}/messages/read", protected.handleMarkOperatorSupportMessagesRead)
}
