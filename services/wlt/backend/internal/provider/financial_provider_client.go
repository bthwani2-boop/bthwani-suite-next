package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type ProviderResult struct {
	ProviderReference string `json:"providerReference"`
	Status            string `json:"status"`
	Code              string `json:"code,omitempty"`
	Message           string `json:"message,omitempty"`
}

func NewClient(config Config) *Client {
	return &Client{
		baseURL: strings.TrimRight(config.BaseURL, "/"),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *Client) Get(ctx context.Context, path string, meta RequestMeta) (ProviderResult, error) {
	return c.do(ctx, http.MethodGet, path, nil, meta)
}

func (c *Client) Post(ctx context.Context, path string, body any, meta RequestMeta) (ProviderResult, error) {
	return c.do(ctx, http.MethodPost, path, body, meta)
}

func (c *Client) do(ctx context.Context, method string, path string, body any, meta RequestMeta) (ProviderResult, error) {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return ProviderResult{}, err
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return ProviderResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-ID", meta.CorrelationID)
	req.Header.Set("Idempotency-Key", meta.IdempotencyKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return ProviderResult{}, err
	}
	defer resp.Body.Close()

	var result ProviderResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ProviderResult{}, err
	}

	if resp.StatusCode >= 400 {
		return result, Error{
			Code:       result.Code,
			StatusCode: resp.StatusCode,
			Message:    result.Message,
		}
	}

	if result.Status == "" {
		return result, fmt.Errorf("provider response missing status")
	}
	return result, nil
}
