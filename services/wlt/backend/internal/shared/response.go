package shared

import (
	"encoding/json"
	"net/http"
	"wlt-api/internal/provider"
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

func SendProviderError(w http.ResponseWriter, err error) {
	if providerErr, ok := err.(provider.Error); ok {
		message := providerErr.Message
		if message == "" {
			message = providerErr.Error()
		}
		SendError(w, http.StatusBadGateway, "PROVIDER_ERROR", message)
		return
	}
	SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
}
