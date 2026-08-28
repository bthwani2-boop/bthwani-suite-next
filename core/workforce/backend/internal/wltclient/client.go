package wltclient

import (
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

func NewClient(baseURL, token string) *Client {
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(token),
		http:    &http.Client{Timeout: 12 * time.Second},
	}
}

type PostPenaltyInput struct {
	IncidentID        string `json:"incidentId"`
	ProviderActorID   string `json:"providerActorId"`
	ProviderActorType string `json:"providerActorType"`
	PolicyID          string `json:"policyId"`
	Reason            string `json:"reason"`
	PostedByActorID   string `json:"postedByActorId"`
}

type ReversePenaltyInput struct {
	Reason            string `json:"reason"`
	ReversedByActorID string `json:"reversedByActorId"`
}

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
