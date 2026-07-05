// Package dshnotify sends payment-session outcome events from WLT (the sole
// owner of payment authorization/capture truth) back to DSH, so non-COD
// checkout intents (wallet, mixed, official_wallet) can leave payment_pending
// once WLT reaches a terminal outcome. Delivery is durable: callers enqueue
// the event in the wlt_dsh_outbox_events table (see internal/dshoutbox) in
// the same transaction as the status transition, and a background worker
// calls Notify with retry until DSH accepts it -- a lost webhook no longer
// depends on a single best-effort HTTP call surviving.
package dshnotify

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

// ErrNotConfigured is returned by Notify when the client is missing the DSH
// base URL or the shared service token, so callers (the outbox worker) can
// distinguish a misconfiguration from a delivery failure rather than
// silently treating an unsent notification as success.
var ErrNotConfigured = errors.New("dshnotify: client is not configured (missing baseURL or serviceToken)")

type Client struct {
	baseURL      string
	serviceToken string
	http         *http.Client
}

// NewClient builds a client for calling DSH. serviceToken is the shared
// secret DSH validates via DSH_WLT_SERVICE_TOKEN; it is sent as the bearer
// token on every outbound request alongside X-Service-Caller: wlt.
func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: serviceToken,
		http:         &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

// Notify reports a terminal payment-session status for a checkout intent to
// DSH. Callers (see internal/dshoutbox) are responsible for retrying on
// error; this call does not retry or swallow failures itself.
func (c *Client) Notify(ctx context.Context, checkoutIntentID, paymentSessionID, status string) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	body, err := json.Marshal(map[string]string{
		"checkoutIntentId": checkoutIntentID,
		"paymentSessionId": paymentSessionID,
		"status":           status,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/dsh/internal/wlt/payment-session-events", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "wlt")
	req.Header.Set("X-Correlation-ID", checkoutIntentID)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &httpStatusError{status: resp.StatusCode}
	}
	return nil
}

type httpStatusError struct{ status int }

func (e *httpStatusError) Error() string {
	return "DSH payment-session event webhook returned non-2xx status"
}