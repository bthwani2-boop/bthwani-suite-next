package http

import (
	"errors"
	"net/http"

	"identity-api/internal/identity"
)

// GovernedRefreshBoundary is the canonical runtime boundary for refresh-token
// rotation. It intercepts only POST /auth/refresh and delegates every other
// request unchanged. Cross-instance serialization lives in Identity's
// repository/database layer rather than process-local BFF memory.
func GovernedRefreshBoundary(repository *identity.Repository, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/auth/refresh" {
			next.ServeHTTP(w, r)
			return
		}

		var request struct {
			RefreshToken string `json:"refreshToken"`
		}
		if !decodeJSON(w, r, &request) {
			return
		}

		pair, err := repository.RefreshGoverned(r.Context(), request.RefreshToken)
		if errors.Is(err, identity.ErrRefreshAlreadyRotated) {
			sendError(
				w,
				http.StatusConflict,
				"REFRESH_ALREADY_ROTATED",
				"refresh token was rotated by another concurrent request",
			)
			return
		}
		if err != nil {
			sendError(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "refresh token is invalid or expired")
			return
		}
		sendJSON(w, http.StatusOK, tokenResponse(pair))
	})
}
