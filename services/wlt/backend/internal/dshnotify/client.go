// Package dshnotify sends best-effort payment-session outcome events from
// WLT (the sole owner of payment authorization/capture truth) back to DSH,
// so non-COD checkout intents (wallet, mixed, official_wallet) can leave
// payment_pending once WLT reaches a terminal outcome. Notification failures
// are logged, not propagated: WLT's own state transition has already been
// committed and is the source of truth: DSH can also poll
// GET /wlt/payment-sessions/{id} to reconcile if a webhook delivery is lost.
package dshnotify

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
}

// NotifyPaymentEvent reports a terminal (or intermediate) payment-session
// status for a checkout intent to DSH. It is fire-and-forget from the
// caller's perspective: errors are logged and swallowed.
func (c *Client) NotifyPaymentEvent(checkoutIntentID, paymentSessionID, status string) {
	if !c.Configured() {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := c.notify(ctx, checkoutIntentID, paymentSessionID, status); err != nil {
			log.Printf("[wlt-api] failed to notify DSH of payment session event (checkoutIntentId=%s, status=%s): %v", checkoutIntentID, status, err)
		}
	}()
}

func (c *Client) notify(ctx context.Context, checkoutIntentID, paymentSessionID, status string) error {
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
	req.Header.Set("Authorization", "Bearer wlt-service")
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
