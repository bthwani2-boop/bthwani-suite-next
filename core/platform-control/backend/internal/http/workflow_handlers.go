package http

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"platform-control-api/internal/auth"
	"platform-control-api/internal/platformcontrol"
)

const maxPlatformRequestBytes int64 = 1 << 20

func (s *server) publicHealth(w http.ResponseWriter, r *http.Request) {
	status := "healthy"
	code := http.StatusOK
	if err := s.service.Ready(r.Context()); err != nil {
		status = "unhealthy"
		code = http.StatusServiceUnavailable
	}
	sendJSON(w, code, map[string]any{"status": status, "service": "platform-control"})
}

func (s *server) publicReadiness(w http.ResponseWriter, r *http.Request) {
	if err := s.service.Ready(r.Context()); err != nil {
		sendJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status":  "not_ready",
			"service": "platform-control",
			"reason":  "database_unavailable",
		})
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"status": "ready", "service": "platform-control"})
}

func (s *server) getChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	_ = identity
	changeSet, err := s.service.GetChangeSet(r.Context(), r.PathValue("id"))
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func (s *server) createChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input platformcontrol.CreateChangeSetInput
	if err := decodePlatformJSON(w, r, &input); err != nil {
		return
	}
	changeSet, err := s.service.CreateChangeSet(
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
	sendJSON(w, http.StatusCreated, map[string]any{"changeSet": changeSet})
}

func (s *server) validateChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	changeSet, err := s.service.ValidateChangeSet(
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
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func (s *server) submitChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	changeSet, err := s.service.SubmitChangeSet(
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
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func (s *server) approveChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	changeSet, err := s.service.ApproveChangeSet(
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
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func (s *server) rejectChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input platformcontrol.RejectChangeSetInput
	if err := decodePlatformJSON(w, r, &input); err != nil {
		return
	}
	changeSet, err := s.service.RejectChangeSet(
		r.Context(),
		r.PathValue("id"),
		identity.Subject,
		identity.Roles,
		correlationID(r),
		input.Reason,
	)
	if err != nil {
		sendPlatformError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func (s *server) applyChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	changeSet, err := s.service.ApplyChangeSet(
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
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func (s *server) rollbackChangeSet(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	changeSet, err := s.service.RollbackChangeSet(
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
	sendJSON(w, http.StatusOK, map[string]any{"changeSet": changeSet})
}

func decodePlatformJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxPlatformRequestBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		if errors.Is(err, io.EOF) {
			sendError(w, http.StatusBadRequest, "INVALID_BODY", "request body is required")
			return err
		}
		sendError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		sendError(w, http.StatusBadRequest, "INVALID_BODY", "request body must contain one JSON object")
		return errors.New("multiple JSON values")
	}
	return nil
}

func correlationID(r *http.Request) string {
	return strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
}

func sendPlatformError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, platformcontrol.ErrNotFound):
		sendError(w, http.StatusNotFound, "PLATFORM_RECORD_NOT_FOUND", err.Error())
	case errors.Is(err, platformcontrol.ErrValidation):
		sendError(w, http.StatusUnprocessableEntity, "PLATFORM_CHANGE_VALIDATION_FAILED", err.Error())
	case errors.Is(err, platformcontrol.ErrInvalidTransition):
		sendError(w, http.StatusConflict, "PLATFORM_INVALID_TRANSITION", err.Error())
	case errors.Is(err, platformcontrol.ErrVersionConflict):
		sendError(w, http.StatusConflict, "PLATFORM_VERSION_CONFLICT", err.Error())
	case errors.Is(err, platformcontrol.ErrMakerChecker):
		sendError(w, http.StatusConflict, "PLATFORM_MAKER_CHECKER_VIOLATION", err.Error())
	case errors.Is(err, platformcontrol.ErrHealthGate):
		sendError(w, http.StatusConflict, "PLATFORM_ROLLOUT_HEALTH_GATE_FAILED", err.Error())
	default:
		sendError(w, http.StatusInternalServerError, "PLATFORM_INTERNAL_ERROR", "platform-control operation failed")
	}
}
