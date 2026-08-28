package http

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/dshclient"
	"workforce-api/internal/workforce"
)

type providerMediaVerifier interface {
	ValidateProviderDocumentMedia(context.Context, string, string, string) error
}

// ReferenceMutationMiddleware provides cross-cutting media verification for provider document links.
// The actual route handlers for city mutations and document links are registered canonically in NewRouter.
// This middleware validates media references for document links before passing to the router.
func ReferenceMutationMiddleware(next http.Handler, repo *workforce.Repository, authClient *auth.Client, mediaVerifier providerMediaVerifier) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// City mutations are now handled by the canonical router.
		// Pass through to the next handler.
		if r.Method == http.MethodPost && r.URL.Path == "/workforce/reference/cities" {
			next.ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/workforce/reference/cities/") {
			next.ServeHTTP(w, r)
			return
		}

		// For document links, perform media verification as a cross-cutting concern.
		if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/documents") {
			if kind, actorID, ok := parseProviderDocumentPath(r.URL.Path); ok {
				// Read the request body to extract mediaRef for validation.
				body, err := io.ReadAll(r.Body)
				if err != nil {
					sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
					return
				}
				r.Body = io.NopCloser(strings.NewReader(string(body)))

				var input struct {
					ExpectedVersion int    `json:"expectedVersion"`
					MediaRef        string `json:"mediaRef"`
				}
				if json.Unmarshal(body, &input) != nil {
					sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
					return
				}

				if mediaVerifier == nil {
					sendError(w, http.StatusServiceUnavailable, "MEDIA_AUTHORITY_UNAVAILABLE", "DSH media authority is unavailable")
					return
				}
				if err := mediaVerifier.ValidateProviderDocumentMedia(r.Context(), actorID, kind, input.MediaRef); err != nil {
					if errors.Is(err, dshclient.ErrProviderMediaInvalid) {
						sendError(w, http.StatusBadRequest, "INVALID_REFERENCE", "media reference is not valid for this provider")
						return
					}
					sendError(w, http.StatusServiceUnavailable, "MEDIA_AUTHORITY_UNAVAILABLE", "DSH media authority is unavailable")
					return
				}

				// Media reference is valid, pass to the router handler.
				next.ServeHTTP(w, r)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func parseProviderDocumentPath(path string) (kind string, actorID string, ok bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 4 || parts[0] != "workforce" || parts[3] != "documents" {
		return "", "", false
	}
	switch parts[1] {
	case "field-agents":
		kind = "field"
	case "captains":
		kind = "captain"
	case "employees":
		kind = "employee"
	default:
		return "", "", false
	}
	actorID = strings.TrimSpace(parts[2])
	return kind, actorID, actorID != ""
}