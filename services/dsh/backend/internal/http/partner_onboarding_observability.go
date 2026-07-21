package http

import (
	"log/slog"
	"net/http"
	"time"
)

type partnerOnboardingStatusWriter struct {
	http.ResponseWriter
	status int
}

func (w *partnerOnboardingStatusWriter) WriteHeader(status int) {
	if w.status != 0 {
		return
	}
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func observePartnerOnboardingRoute(operation string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		captured := &partnerOnboardingStatusWriter{ResponseWriter: w}
		next(captured, r)

		status := captured.status
		if status == 0 {
			status = http.StatusOK
		}
		outcome := "success"
		if status >= http.StatusInternalServerError {
			outcome = "server_error"
		} else if status >= http.StatusBadRequest {
			outcome = "rejected"
		}
		surface, _ := r.Context().Value("actor_surface").(string)
		slog.Info(
			"partner_onboarding_operation",
			"journey_id", "JRN-001",
			"operation", operation,
			"outcome", outcome,
			"http_status", status,
			"duration_ms", time.Since(started).Milliseconds(),
			"actor_surface", surface,
			"partner_id", r.PathValue("partnerId"),
			"correlation_id", r.Header.Get("X-Correlation-ID"),
		)
	}
}
