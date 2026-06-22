package shared

import (
	"encoding/json"
	"net/http"
)

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func SendJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func SendError(w http.ResponseWriter, status int, code, message string) {
	SendJSON(w, status, ApiError{Code: code, Message: message})
}
