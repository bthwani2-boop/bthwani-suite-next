package provider

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

	resilience "github.com/bthwani2-boop/bthwani-resilience"
)

type Client struct {
	baseURL      string
	httpClient   *http.Client
	breaker      *resilience.CircuitBreaker
	reg          *Registry
	providerType string
	environment  string
}

type ProviderResult struct {
	ProviderReference string `json:"providerReference"`
	Status            string `json:"status"`
	Code              string `json:"code,omitempty"`
	Message           string `json:"message,omitempty"`
}

func newClient(config Config, reg *Registry, providerType, environment string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(config.BaseURL, "/"),
		providerType: strings.TrimSpace(providerType),
		environment:  strings.TrimSpace(environment),
		// The timeout will be dynamically overridden per-request
		httpClient: &http.Client{Timeout: config.TimeoutBudget},
		breaker: resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
			FailureThreshold: 5,
			SuccessThreshold: 2,
			Timeout:          30 * time.Second,
		}),
		reg: reg,
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

	var reqCtx = ctx
	if c.reg != nil {
		cfg, _, err := c.reg.GetActiveProvider(ctx, c.providerType, c.environment)
		if err == nil && cfg.TimeoutBudget > 0 {
			var cancel context.CancelFunc
			reqCtx, cancel = context.WithTimeout(ctx, cfg.TimeoutBudget)
			defer cancel()
		}
	}

	req, err := http.NewRequestWithContext(reqCtx, method, c.baseURL+path, reader)
	if err != nil {
		return ProviderResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-ID", meta.CorrelationID)
	req.Header.Set("Idempotency-Key", meta.IdempotencyKey)

	var resp *http.Response
	execErr := c.breaker.Execute(func() error {
		var execError error
		resp, execError = c.httpClient.Do(req)
		if execError != nil {
			return execError
		}
		if resp.StatusCode >= 500 {
			return fmt.Errorf("upstream status %d", resp.StatusCode)
		}
		return nil
	})

	if execErr != nil {
		if resp != nil {
			_ = resp.Body.Close()
		}
		if errors.Is(execErr, resilience.ErrCircuitOpen) {
			return ProviderResult{}, fmt.Errorf("provider circuit breaker is OPEN")
		}
		return ProviderResult{}, execErr
	}

	if resp == nil {
		return ProviderResult{}, execErr
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
