package providers

import (
	"encoding/json"
	"time"
)

type ExternalProvider struct {
	ProviderID  string          `json:"providerId"`
	Kind        string          `json:"kind"`
	Code        string          `json:"code"`
	Active      bool            `json:"active"`
	Credentials json.RawMessage `json:"credentials,omitempty"`
	Parameters  json.RawMessage `json:"parameters,omitempty"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type UpdateProviderInput struct {
	Active      *bool            `json:"active"`
	Credentials *json.RawMessage `json:"credentials"`
	Parameters  *json.RawMessage `json:"parameters"`
}

type ExternalProviderHealthItem struct {
	Kind      string    `json:"kind"`
	Status    string    `json:"status"`
	CheckedAt time.Time `json:"checkedAt"`
	Message   string    `json:"message,omitempty"`
}

type ExternalProviderHealthResponse struct {
	Providers []ExternalProviderHealthItem `json:"providers"`
}

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
