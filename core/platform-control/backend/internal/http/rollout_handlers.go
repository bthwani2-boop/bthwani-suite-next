package http

import (
	"net/http"

	auth "github.com/bthwani2-boop/bthwani-identityauth"
	"platform-control-api/internal/platformcontrol"
)

func (s *server) listRollouts(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	_ = identity
	rollouts, err := s.service.Rollouts(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"rollouts": rollouts})
}

func (s *server) getRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	_ = identity
	rollout, err := s.service.GetRollout(r.Context(), r.PathValue("id"))
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"rollout": rollout})
}

func (s *server) createRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	var input platformcontrol.CreateRolloutInput
	if err := decodePlatformJSON(w, r, &input); err != nil {
		return
	}
	rollout, err := s.service.CreateRollout(
		r.Context(),
		identity.Subject,
		identity.Roles,
		correlationID(r),
		input,
	)
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusCreated, map[string]any{"rollout": rollout})
}

func (s *server) advanceRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	rollout, err := s.service.AdvanceRollout(
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

func (s *server) pauseRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	rollout, err := s.service.PauseRollout(
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

func (s *server) resumeRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
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

func (s *server) abortRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	rollout, err := s.service.AbortRollout(
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

func (s *server) rollbackRollout(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	rollout, err := s.service.RollbackRollout(
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

func (s *server) getRolloutRecovery(w http.ResponseWriter, r *http.Request, identity auth.ActorIdentity) {
	_ = identity
	recovery, err := s.service.GetRolloutRecoveryGuide(r.Context(), r.PathValue("id"))
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"recovery": recovery})
}
