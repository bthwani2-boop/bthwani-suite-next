package http

import (
	"net/http"
	"strings"
)

// BrowserCorsMiddleware extends the existing Identity CORS contract with the
// DELETE method required by session revocation and account deletion. The inner
// CorsMiddleware remains the single owner of origins, headers, and preflight
// status; this adapter only repairs the missing method before headers commit.
func BrowserCorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(&deleteCorsResponseWriter{ResponseWriter: w}, r)
	})
}

type deleteCorsResponseWriter struct {
	http.ResponseWriter
}

func (w *deleteCorsResponseWriter) WriteHeader(statusCode int) {
	w.ensureDeleteMethod()
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *deleteCorsResponseWriter) Write(body []byte) (int, error) {
	w.ensureDeleteMethod()
	return w.ResponseWriter.Write(body)
}

func (w *deleteCorsResponseWriter) ensureDeleteMethod() {
	methods := strings.TrimSpace(w.Header().Get("Access-Control-Allow-Methods"))
	if methods == "" || strings.Contains(methods, http.MethodDelete) {
		return
	}
	w.Header().Set("Access-Control-Allow-Methods", methods+", "+http.MethodDelete)
}
