package http

import (
	"bytes"
	"io"
	"net/http"

	"dsh-api/internal/store"
)

// writeFinanceResponse is the only external writer for DSH finance responses.
// The WLT client has already validated and normalized the operation-specific
// response; this function owns the final public header and error boundary.
func writeFinanceResponse(w http.ResponseWriter, status int, body []byte, err error) {
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "FINANCE_RESPONSE_UNAVAILABLE", "finance operation response was invalid or unavailable")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if status >= 200 && status < 300 && w.Header().Get("Cache-Control") == "" {
		w.Header().Set("Cache-Control", "no-store")
	}
	w.WriteHeader(status)
	if len(body) == 0 {
		return
	}
	_, _ = io.Copy(w, bytes.NewReader(body))
}
