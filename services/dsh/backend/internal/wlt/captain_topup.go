package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

var ErrCaptainTopUpNotOwned = errors.New("captain top-up session is not owned by the authenticated captain")

// CaptainTopUpSession is the bounded WLT readback used by the Captain Cash-In
// consumer. Monetary state, purpose and ledger references remain WLT-owned.
type CaptainTopUpSession struct {
	ID                string  `json:"id"`
	OperatorContextID string  `json:"operatorContextId"`
	ClientID          string  `json:"clientId"`
	TopUpReference    *string `json:"topupReference"`
	TopUpActorType    *string `json:"topupActorType"`
	FinancialPurpose  string  `json:"financialPurpose"`
	PaymentMethod     string  `json:"paymentMethod"`
	Status            string  `json:"status"`
	ProviderReference string  `json:"providerReference"`
	AmountMinorUnits  int64   `json:"amountMinorUnits"`
	Currency          string  `json:"currency"`
	CapturedAt        *string `json:"capturedAt"`
}

type captainTopUpEnvelope struct {
	PaymentSession CaptainTopUpSession `json:"paymentSession"`
}

func (c *Client) captainTopUpRequest(ctx context.Context, method, path string, body []byte, correlationID, idempotencyKey, operatorContextID string) (int, []byte, error) {
	if !c.Configured() {
		return 0, nil, ErrNotConfigured
	}
	var reader io.Reader
	if len(body) > 0 {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return 0, nil, fmt.Errorf("build WLT Captain top-up request: %w", err)
	}
	setServiceHeaders(req, c.serviceToken)
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return 0, nil, fmt.Errorf("WLT Captain top-up OperatorContext is required")
	}
	if _, err := c.setDelegatedOperatorContextHeader(req, operatorContextID); err != nil {
		return 0, nil, fmt.Errorf("prepare WLT Captain top-up OperatorContext: %w", err)
	}
	if method != http.MethodGet {
		if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
			return 0, nil, fmt.Errorf("prepare WLT Captain top-up mutation: %w", err)
		}
	} else if strings.TrimSpace(correlationID) != "" {
		req.Header.Set("X-Correlation-ID", strings.TrimSpace(correlationID))
	}
	response, err := c.http.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("call WLT Captain top-up route: %w", err)
	}
	defer func() { _ = response.Body.Close() }()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxFinanceProxyResponseBytes+1))
	if err != nil {
		return 0, nil, fmt.Errorf("read WLT Captain top-up response: %w", err)
	}
	if len(responseBody) > maxFinanceProxyResponseBytes {
		return 0, nil, fmt.Errorf("WLT Captain top-up response exceeds the %d-byte limit", maxFinanceProxyResponseBytes)
	}
	opID := "finance.payment_sessions.read"
	switch {
	case req.Method == http.MethodPost && req.URL.Path == "/wlt/topup-sessions":
		opID = "finance.topup_sessions.create"
	case strings.HasSuffix(req.URL.Path, "/authorize"):
		opID = "finance.topup_sessions.authorize"
	case strings.HasSuffix(req.URL.Path, "/capture"):
		opID = "finance.topup_sessions.capture"
	}
	op, err := Registry.GetOperation(opID)
	if err != nil {
		return 0, nil, err
	}
	normalizedStatus, normalizedBody, err := normalizeFinanceResponse(op, response.StatusCode, response.Header.Get("Content-Type"), responseBody)
	if err != nil {
		return 0, nil, fmt.Errorf("validate WLT Captain top-up response: %w", err)
	}
	return normalizedStatus, normalizedBody, nil
}

func (c *Client) CreateCaptainTopUpSession(ctx context.Context, actorID, topUpReference string, amountMinorUnits int64, currency, correlationID, idempotencyKey, operatorContextID string) (int, []byte, error) {
	actorID = strings.TrimSpace(actorID)
	topUpReference = strings.TrimSpace(topUpReference)
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if actorID == "" || topUpReference == "" || amountMinorUnits <= 0 || len(currency) != 3 {
		return 0, nil, fmt.Errorf("invalid Captain top-up input")
	}
	body, err := json.Marshal(map[string]any{
		"actorType":        "captain",
		"actorId":          actorID,
		"topupReference":   topUpReference,
		"amountMinorUnits": amountMinorUnits,
		"currency":         currency,
	})
	if err != nil {
		return 0, nil, fmt.Errorf("encode Captain top-up input: %w", err)
	}
	return c.captainTopUpRequest(ctx, http.MethodPost, "/wlt/topup-sessions", body, correlationID, idempotencyKey, operatorContextID)
}

func (c *Client) ReadCaptainTopUpSession(ctx context.Context, sessionID, actorID, correlationID, operatorContextID string) (int, []byte, error) {
	sessionID = strings.TrimSpace(sessionID)
	actorID = strings.TrimSpace(actorID)
	if sessionID == "" || actorID == "" {
		return 0, nil, fmt.Errorf("captain top-up session and actor are required")
	}
	status, body, err := c.captainTopUpRequest(ctx, http.MethodGet, "/wlt/payment-sessions/"+url.PathEscape(sessionID), nil, correlationID, "", operatorContextID)
	if err != nil || status < 200 || status >= 300 {
		return status, body, err
	}
	var envelope captainTopUpEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return 0, nil, fmt.Errorf("decode WLT Captain top-up readback: %w", err)
	}
	session := envelope.PaymentSession
	if session.ID != sessionID || session.ClientID != actorID || session.FinancialPurpose != "captain_topup" || session.TopUpActorType == nil || *session.TopUpActorType != "captain" {
		return http.StatusNotFound, nil, ErrCaptainTopUpNotOwned
	}
	return status, body, nil
}

func (c *Client) MutateCaptainTopUpSession(ctx context.Context, sessionID, operation, correlationID, idempotencyKey, actorID, operatorContextID string) (int, []byte, error) {
	if operation != "authorize" && operation != "capture" {
		return 0, nil, fmt.Errorf("unsupported Captain top-up operation")
	}
	status, body, err := c.ReadCaptainTopUpSession(ctx, sessionID, actorID, correlationID, operatorContextID)
	if err != nil || status < 200 || status >= 300 {
		return status, body, err
	}
	return c.captainTopUpRequest(ctx, http.MethodPost, "/wlt/topup-sessions/"+url.PathEscape(strings.TrimSpace(sessionID))+"/"+operation, []byte("{}"), correlationID, idempotencyKey, operatorContextID)
}
