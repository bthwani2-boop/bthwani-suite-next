package http

import (
	"net/http"

	"platform-control-api/internal/auth"
	"platform-control-api/internal/platformcontrol"
)

func (s *server) listRollouts(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	rollouts, err := s.service.Rollouts(r.Context())
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"rollouts": rollouts})
}

func (s *server) getRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	rollout, err := s.service.GetRollout(r.Context(), r.PathValue("id"))
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"rollout": rollout})
}

func (s *server) createRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
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

func (s *server) advanceRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
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

func (s *server) pauseRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
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

func (s *server) abortRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
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

func (s *server) rollbackRollout(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
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
