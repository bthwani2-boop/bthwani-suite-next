package http

import (
	"net/http"

	"platform-control-api/internal/auth"
)

func (s *server) resumeRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	rollout, err := s.service.ResumeRollout(
		r.Context(),
		r.PathValue("id"),
		identity.Subject,
		identity.Roles,
		correlationID(r),
	)
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"rollout": rollout})
}

func (s *server) getRolloutRecovery(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	recovery, err := s.service.GetRolloutRecoveryGuide(r.Context(), r.PathValue("id"))
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"recovery": recovery})
}
