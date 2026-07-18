package mapproviders

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrNotConfigured = errors.New("providers map runtime is not configured")
	ErrUnavailable   = errors.New("providers map runtime is unavailable")
	ErrInvalid       = errors.New("providers map request is invalid")
)

type Client struct {
	baseURL string
	http    *http.Client
}

type SearchInput struct {
	Query        string   `json:"query"`
	Limit        int      `json:"limit,omitempty"`
	Language     string   `json:"language,omitempty"`
	CountryCodes []string `json:"countryCodes,omitempty"`
}

type ReverseInput struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Language  string  `json:"language,omitempty"`
}

type Location struct {
	ProviderCode       string  `json:"providerCode"`
	ProviderPlaceID    string  `json:"providerPlaceId"`
	DisplayName        string  `json:"displayName"`
	Latitude           float64 `json:"latitude"`
	Longitude          float64 `json:"longitude"`
	CountryCode        string  `json:"countryCode,omitempty"`
	AdministrativeArea string  `json:"administrativeArea,omitempty"`
	Locality            string  `json:"locality,omitempty"`
	PostalCode          string  `json:"postalCode,omitempty"`
	Confidence          float64 `json:"confidence,omitempty"`
}

type SearchResponse struct {
	Locations []Location `json:"locations"`
}

type ReverseResponse struct {
	Location Location `json:"location"`
}

type upstreamError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		http:    &http.Client{Timeout: 8 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
}

func (c *Client) Search(ctx context.Context, authorization string, input SearchInput) (SearchResponse, error) {
	var response SearchResponse
	if err := c.post(ctx, authorization, "/providers/maps/search", input, &response); err != nil {
		return SearchResponse{}, err
	}
	return response, nil
}

func (c *Client) Reverse(ctx context.Context, authorization string, input ReverseInput) (ReverseResponse, error) {
	var response ReverseResponse
	if err := c.post(ctx, authorization, "/providers/maps/reverse", input, &response); err != nil {
		return ReverseResponse{}, err
	}
	return response, nil
}

func (c *Client) post(ctx context.Context, authorization, path string, input, output any) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	payload, err := json.Marshal(input)
	if err != nil {
		return ErrInvalid
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return ErrUnavailable
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", strings.TrimSpace(authorization))
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiError upstreamError
		_ = json.Unmarshal(body, &apiError)
		switch resp.StatusCode {
		case http.StatusBadRequest:
			return fmt.Errorf("%w: %s", ErrInvalid, apiError.Code)
		case http.StatusServiceUnavailable, http.StatusBadGateway:
			return fmt.Errorf("%w: %s", ErrUnavailable, apiError.Code)
		default:
			return fmt.Errorf("%w: upstream status %d", ErrUnavailable, resp.StatusCode)
		}
	}
	if err := json.Unmarshal(body, output); err != nil {
		return fmt.Errorf("%w: invalid upstream response", ErrUnavailable)
	}
	return nil
}
