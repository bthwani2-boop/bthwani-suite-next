package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/supportsession"
	"dsh-api/internal/wlt"
)

func RegisterAdministrationSupportRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
	supportClient *supportsession.Client,
) {
	server := &administrationSupportServer{
		protected: newProtectedStoreServer(db, identityClient, wltClient, mediaProvider),
		db:        db,
		identity:  supportClient,
	}
	router.HandleFunc("POST /dsh/operator/admin/support-sessions", server.handleCreateRequest)
	router.HandleFunc("GET /dsh/operator/admin/support-sessions", server.handleListRequests)
	router.HandleFunc("POST /dsh/operator/admin/support-sessions/{requestId}/review", server.handleReviewRequest)
	router.HandleFunc("POST /dsh/operator/admin/support-sessions/{requestId}/revoke", server.handleRevokeRequest)
	router.HandleFunc("GET /dsh/operator/admin/support/snapshot", server.handleSupportSnapshot)
}

type administrationSupportServer struct {
	protected *protectedStoreServer
	db        *sql.DB
	identity  *supportsession.Client
}

func writeSupportRequestError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, supportsession.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "SUPPORT_REQUEST_INVALID", "support session request is invalid")
	case errors.Is(err, supportsession.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "SUPPORT_REQUEST_NOT_FOUND", "support session request was not found")
	case errors.Is(err, supportsession.ErrSelfApproval):
		store.SendError(w, http.StatusForbidden, "SELF_APPROVAL_FORBIDDEN", "maker, target, and checker must be different actors")
	case errors.Is(err, supportsession.ErrConflict), errors.Is(err, supportsession.ErrIdentityConflict):
		store.SendError(w, http.StatusConflict, "SUPPORT_REQUEST_CONFLICT", "support session request changed or is no longer active")
	case errors.Is(err, supportsession.ErrNotConfigured):
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_SUPPORT_NOT_CONFIGURED", "identity support session integration is not configured")
	case errors.Is(err, supportsession.ErrIdentityDenied):
		store.SendError(w, http.StatusBadGateway, "IDENTITY_SUPPORT_DENIED", "identity rejected the support session handoff")
	default:
		store.SendError(w, http.StatusInternalServerError, "SUPPORT_REQUEST_FAILED", "support session action failed")
	}
}

func (s *administrationSupportServer) handleCreateRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.protected.requireAdministrationPermission(w, r, AdministrationPermissionManage)
	if !ok {
		return
	}
	var body struct {
		TargetActorID  string `json:"targetActorId"`
		Reason         string `json:"reason"`
		DurationMinutes int   `json:"durationMinutes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	request, err := supportsession.CreateRequest(
		r.Context(), s.db, body.TargetActorID, actor.ID, body.Reason, body.DurationMinutes,
	)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"request": request})
}

func (s *administrationSupportServer) handleListRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.protected.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	requests, err := supportsession.ListRequests(r.Context(), s.db, r.URL.Query().Get("status"), 100)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"requests": requests})
}

func (s *administrationSupportServer) handleReviewRequest(w http.ResponseWriter, r *http.Request) {
	checker, ok := s.protected.requireAdministrationPermission(w, r, AdministrationPermissionApprove)
	if !ok {
		return
	}
	var body struct {
		Decision        string `json:"decision"`
		ReviewNote      string `json:"reviewNote"`
		ExpectedVersion int    `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	request, err := supportsession.ReviewRequest(
		r.Context(), s.db, r.PathValue("requestId"), checker.ID,
		body.Decision, body.ReviewNote, body.ExpectedVersion,
	)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	if body.Decision == "rejected" {
		store.SendJSON(w, http.StatusOK, map[string]any{"request": request, "token": nil})
		return
	}
	issued, err := s.identity.Issue(
		r.Context(), request.ID, request.TargetActorID, request.RequestedBy,
		request.Reason, request.DurationMinutes,
	)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	request, err = supportsession.MarkIssued(
		r.Context(), s.db, request.ID, issued.Identity.SessionID, issued.Identity.ExpiresAt,
	)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"request": request, "token": issued})
}

func (s *administrationSupportServer) handleRevokeRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.protected.requireAdministrationPermission(w, r, AdministrationPermissionApprove)
	if !ok {
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	requestID := r.PathValue("requestId")
	if err := s.identity.Revoke(r.Context(), requestID, body.Reason); err != nil {
		writeSupportRequestError(w, err)
		return
	}
	request, err := supportsession.MarkRevoked(r.Context(), s.db, requestID, actor.ID, body.Reason)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"request": request})
}

func bearerToken(header string) string {
	parts := strings.Fields(strings.TrimSpace(header))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func hasSupportRead(identity supportsession.Identity) bool {
	if identity.SessionKind != "support" || identity.Subject == "" || identity.InitiatorActorID == "" {
		return false
	}
	for _, permission := range identity.Permissions {
		if permission.Service == "dsh" && permission.Surface == "control-panel" &&
			permission.Action == "support.read" && permission.Scope == "actor:"+identity.Subject {
			return true
		}
	}
	return false
}

func (s *administrationSupportServer) handleSupportSnapshot(w http.ResponseWriter, r *http.Request) {
	accessToken := bearerToken(r.Header.Get("Authorization"))
	if accessToken == "" {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "support bearer session is required")
		return
	}
	identity, err := s.identity.Resolve(r.Context(), accessToken)
	if err != nil || !hasSupportRead(identity) {
		store.SendError(w, http.StatusForbidden, "SUPPORT_SESSION_FORBIDDEN", "support session is invalid, expired, or outside its read scope")
		return
	}
	snapshot, err := supportsession.LoadSnapshot(r.Context(), s.db, identity.Subject)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"identity": identity,
		"snapshot": snapshot,
	})
}
