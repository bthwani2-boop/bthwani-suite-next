package wlt

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	ErrPaymentSessionOutcomeUnknown = errors.New("WLT payment-session outcome is unknown")
	ErrMutationOutcomeUnknown       = errors.New("WLT mutation outcome is unknown")
)

type PaymentSessionHTTPError struct {
	StatusCode int
}

func (e PaymentSessionHTTPError) Error() string {
	return fmt.Sprintf("WLT payment session returned HTTP %d", e.StatusCode)
}

func IsPaymentSessionOutcomeUnknown(err error) bool {
	return errors.Is(err, ErrPaymentSessionOutcomeUnknown)
}

func IsMutationOutcomeUnknown(err error) bool {
	return errors.Is(err, ErrMutationOutcomeUnknown)
}

type Client struct {
	baseURL      string
	serviceToken string
	http         *http.Client
}

type CreatePaymentSessionInput struct {
	CheckoutIntentID string `json:"checkoutIntentId,omitempty"`
	SpecialRequestID string `json:"specialRequestId,omitempty"`
	ClientID         string `json:"clientId"`
	StoreID          string `json:"storeId"`
	PaymentMethod    string `json:"paymentMethod"`
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
	CartSnapshotHash string `json:"cartSnapshotHash"`
	PricingQuoteID   string `json:"pricingQuoteId"`
	CorrelationID    string `json:"-"`
	IdempotencyKey   string `json:"-"`
}

type PaymentSession struct {
	ID                    string                   `json:"id"`
	CheckoutIntentID      string                   `json:"checkoutIntentId"`
	SpecialRequestID      string                   `json:"specialRequestId"`
	OperatorContextID     string                   `json:"operatorContextId"`
	ClientID              string                   `json:"clientId"`
	StoreID               string                   `json:"storeId"`
	PaymentMethod         string                   `json:"paymentMethod"`
	Status                string                   `json:"status"`
	ProviderReference     string                   `json:"providerReference"`
	AmountMinorUnits      int64                    `json:"amountMinorUnits"`
	Currency              string                   `json:"currency"`
	TenderAllocation      *PaymentTenderAllocation `json:"tenderAllocation,omitempty"`
	CreatedAt             string                   `json:"createdAt"`
	UpdatedAt             string                   `json:"updatedAt"`
	PricingQuoteID        string                   `json:"pricingQuoteId,omitempty"`
	PricingQuoteHash      string                   `json:"pricingQuoteHash,omitempty"`
	PricingQuoteVersion   int                      `json:"pricingQuoteVersion,omitempty"`
	PricingQuoteExpiresAt string                   `json:"pricingQuoteExpiresAt,omitempty"`
}

type PaymentTenderAllocation struct {
	WalletAmountMinorUnits         int64  `json:"walletAmountMinorUnits"`
	CashOnDeliveryAmountMinorUnits int64  `json:"cashOnDeliveryAmountMinorUnits"`
	Currency                       string `json:"currency"`
}

// NewClient builds the authenticated DSH-to-WLT service client. Financial
// ownership is resolved inside WLT after service authentication; DSH does not
// select it through the payment-session payload.
func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: serviceToken,
		http: &http.Client{
			Timeout:   10 * time.Second,
			Transport: OperatorContextRoundTripper{base: http.DefaultTransport},
		},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != "" && c.serviceToken != ""
}

// resolveDelegatedOperatorContext and setDelegatedOperatorContextHeader
// propagate the canonical OperatorContext to WLT after service authentication.
func (c *Client) resolveDelegatedOperatorContext(ctx context.Context, requested string) (string, error) {
	requested = strings.TrimSpace(requested)
	delegatedOperatorContextID, hasDelegatedOperatorContext := OperatorContextIDFromContext(ctx)
	if !hasDelegatedOperatorContext {
		return "", fmt.Errorf("trusted OperatorContext context is required for this WLT request")
	}
	if requested != "" && requested != delegatedOperatorContextID {
		return "", fmt.Errorf("requested OperatorContext does not match trusted request context")
	}
	return delegatedOperatorContextID, nil
}

func (c *Client) setDelegatedOperatorContextHeader(req *http.Request, requested string) (string, error) {
	operatorContextID, err := c.resolveDelegatedOperatorContext(req.Context(), requested)
	if err != nil {
		return "", err
	}
	req.Header.Set("X-Delegated-Operator-Context", operatorContextID)
	return operatorContextID, nil
}

func (c *Client) CreatePaymentSession(ctx context.Context, input CreatePaymentSessionInput) (*PaymentSession, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("WLT payment-session handoff is not configured")
	}
	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("encode WLT payment session request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/payment-sessions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build WLT payment session request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return nil, fmt.Errorf("prepare WLT payment session OperatorContext: %w", err)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		if input.SpecialRequestID != "" {
			correlationID = input.SpecialRequestID
		} else {
			correlationID = input.CheckoutIntentID
		}
	}
	idempotencyKey := strings.TrimSpace(input.IdempotencyKey)
	if idempotencyKey == "" {
		if input.SpecialRequestID != "" {
			idempotencyKey = deterministicMutationKey("special-request-payment-session", input.SpecialRequestID)
		} else {
			idempotencyKey = deterministicMutationKey("checkout-payment-session", input.CheckoutIntentID)
		}
	}
	if err := setRequiredMutationHeaders(req, correlationID, idempotencyKey); err != nil {
		return nil, fmt.Errorf("prepare WLT payment session request: %w", err)
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: call WLT payment session: %v", ErrPaymentSessionOutcomeUnknown, err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		if response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500 {
			return nil, fmt.Errorf("%w: HTTP %d", ErrPaymentSessionOutcomeUnknown, response.StatusCode)
		}
		return nil, PaymentSessionHTTPError{StatusCode: response.StatusCode}
	}
	var envelope struct {
		PaymentSession PaymentSession `json:"paymentSession"`
	}
	if err := json.NewDecoder(response.Body).Decode(&envelope); err != nil {
		return nil, fmt.Errorf("%w: decode WLT payment session response: %v", ErrPaymentSessionOutcomeUnknown, err)
	}
	if envelope.PaymentSession.ID == "" {
		return nil, fmt.Errorf("%w: WLT payment session response missing id", ErrPaymentSessionOutcomeUnknown)
	}
	return &envelope.PaymentSession, nil
}

type DeliverFieldCommissionInput struct {
	BeneficiaryActorID   string `json:"beneficiaryActorId"`
	BeneficiaryActorType string `json:"beneficiaryActorType"`
	SourceType           string `json:"sourceType"`
	SourceID             string `json:"sourceId"`
	VisitID              string `json:"visitId"`
	StoreID              string `json:"storeId"`
	IdempotencyKey       string `json:"idempotencyKey"`
	CorrelationID        string `json:"-"`
}

func (c *Client) DeliverFieldCommission(ctx context.Context, input DeliverFieldCommissionInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	if input.BeneficiaryActorType == "" {
		input.BeneficiaryActorType = "field"
	}
	if input.SourceType == "" {
		input.SourceType = "field_visit"
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = deterministicMutationKey("field-commission", input.VisitID, input.SourceID, input.BeneficiaryActorID)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = strings.TrimSpace(input.VisitID)
	}
	body, err := json.Marshal(input)
	if err != nil {
		return fmt.Errorf("encode WLT field commission request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/commissions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT field commission request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return fmt.Errorf("prepare WLT commission OperatorContext: %w", err)
	}
	if err := setRequiredMutationHeaders(req, correlationID, input.IdempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT field commission request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT field commission: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT field commission returned HTTP %d", response.StatusCode)
	}
	return nil
}

type DeliverCaptainCommissionInput struct {
	CaptainID        string `json:"beneficiaryActorId"`
	OrderID          string `json:"sourceId"`
	CheckoutIntentID string `json:"sourceEvidenceId"`
	IdempotencyKey   string `json:"idempotencyKey"`
	CorrelationID    string `json:"-"`
}

func (c *Client) DeliverCaptainCommission(ctx context.Context, input DeliverCaptainCommissionInput) error {
	if !c.Configured() {
		return fmt.Errorf("WLT commission handoff is not configured")
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = deterministicMutationKey("captain-delivery-commission", input.OrderID, input.CheckoutIntentID, input.CaptainID)
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = strings.TrimSpace(input.OrderID)
	}
	body, err := json.Marshal(map[string]string{
		"beneficiaryActorType": "captain",
		"beneficiaryActorId":   input.CaptainID,
		"sourceType":           "order",
		"sourceId":             input.OrderID,
		"commissionType":       "delivery_fee",
		"sourceEvidenceId":     input.CheckoutIntentID,
		"sourceEvidenceStatus": "completed",
	})
	if err != nil {
		return fmt.Errorf("encode WLT captain commission request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/wlt/commissions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build WLT captain commission request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return fmt.Errorf("prepare WLT commission OperatorContext: %w", err)
	}
	if err := setRequiredMutationHeaders(req, correlationID, input.IdempotencyKey); err != nil {
		return fmt.Errorf("prepare WLT captain commission request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("call WLT captain commission: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT captain commission returned HTTP %d", response.StatusCode)
	}
	return nil
}

func (c *Client) ExpireSession(ctx context.Context, paymentSessionID, correlationID string) error {
	if !c.Configured() {
		return fmt.Errorf("WLT payment-session handoff is not configured")
	}
	if paymentSessionID == "" {
		return fmt.Errorf("paymentSessionID is required")
	}
	path := "/wlt/payment-sessions/" + url.PathEscape(paymentSessionID) + "/expire"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return fmt.Errorf("build WLT expire-session request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	if _, err := c.setDelegatedOperatorContextHeader(req, ""); err != nil {
		return fmt.Errorf("prepare WLT expire OperatorContext: %w", err)
	}
	if strings.TrimSpace(correlationID) == "" {
		correlationID = paymentSessionID
	}
	if err := setRequiredMutationHeaders(req, correlationID, deterministicMutationKey("payment-session-expire", paymentSessionID)); err != nil {
		return fmt.Errorf("prepare WLT expire-session request: %w", err)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("%w: call WLT expire-session: %v", ErrMutationOutcomeUnknown, err)
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusConflict {
		return nil
	}
	if response.StatusCode == http.StatusRequestTimeout || response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500 {
		return fmt.Errorf("%w: WLT expire-session returned HTTP %d", ErrMutationOutcomeUnknown, response.StatusCode)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("WLT expire-session returned HTTP %d", response.StatusCode)
	}
	return nil
}
