package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
)

const activationRequestLimit = 32 * 1024

// ActivationSafetyMiddleware prevents the local bootstrap code from becoming
// an authentication bypass outside an explicitly enabled local environment.
// The request body is restored unchanged so the canonical activation handler
// remains the sole owner of validation and session creation.
func ActivationSafetyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/auth/activate" {
			next.ServeHTTP(w, r)
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, activationRequestLimit+1))
		if err != nil || len(body) > activationRequestLimit {
			sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))

		var request struct {
			Code string `json:"code"`
		}
		if json.Unmarshal(body, &request) == nil && strings.TrimSpace(request.Code) == "000000" && os.Getenv("IDENTITY_LOCAL_BOOTSTRAP") != "true" {
			sendError(w, http.StatusUnauthorized, "INVALID_ACTIVATION", "activation code is invalid or expired")
			return
		}

		next.ServeHTTP(w, r)
	})
}
