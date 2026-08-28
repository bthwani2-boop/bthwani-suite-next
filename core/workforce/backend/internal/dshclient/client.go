package dshclient

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
	"time"

	workforceauth "workforce-api/internal/auth"
)

var (
	ErrZoneNotFound               = errors.New("zone not found")
	ErrZoneInactive               = errors.New("zone is inactive")
	ErrUnavailable                = errors.New("dsh-api is unavailable")
	ErrProviderMediaInvalid       = errors.New("provider media reference is invalid")
	ErrAvailabilityOutcomeUnknown = errors.New("DSH availability projection outcome is unknown")
	ErrAvailabilityRejected       = errors.New("DSH availability projection was rejected")
	ErrAvailabilityStale          = errors.New("DSH availability projection is stale")
	ErrAvailabilityMalformed      = errors.New("DSH availability projection response is malformed")
)

type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

type CaptainFinancialEligibility struct {
	OperatorContextID   string    `json:"operatorContextId"`
	CaptainID           string    `json:"captainId"`
	WltDecisionID       string    `json:"wltDecisionId"`
	WltReasonCode       string    `json:"wltReasonCode"`
	WltPolicyVersion    string    `json:"wltPolicyVersion"`
	Eligible            bool      `json:"eligible"`
	IneligibilityReason string    `json:"ineligibilityReason,omitempty"`
	SnapshotReference   string    `json:"snapshotReference"`
	CheckedAt           time.Time `json:"checkedAt"`
	EvaluatedAt         time.Time `json:"evaluatedAt"`
	ExpiresAt           time.Time `json:"expiresAt"`
}

func NewClient(baseURL, serviceToken string) *Client {
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(serviceToken),
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
}

func (c *Client) AvailabilityProjectionConfigured() bool {
	return c.Configured() && c.token != ""
}

type Zone struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	ServiceAreaCode string `json:"serviceAreaCode"`
	IsActive        bool   `json:"isActive"`
	Description     string `json:"description"`
}

type listZonesResponse struct {
	Zones []Zone `json:"zones"`
}

func (c *Client) ValidateZone(ctx context.Context, zoneID, operatorToken string) (Zone, error) {
	if !c.Configured() {
		return Zone{}, ErrUnavailable
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/dsh/operator/platform/zones?includeInactive=true", nil)
	if err != nil {
		return Zone{}, fmt.Errorf("build zone request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	if operatorToken != "" {
		req.Header.Set("Authorization", operatorToken)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return Zone{}, ErrUnavailable
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Zone{}, fmt.Errorf("dsh-api returned HTTP %d", resp.StatusCode)
	}

	var data listZonesResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Zone{}, fmt.Errorf("decode zone response: %w", err)
	}

	for _, z := range data.Zones {
		if z.ID == zoneID {
			if !z.IsActive {
				return Zone{}, ErrZoneInactive
			}
			return z, nil
		}
	}

	return Zone{}, ErrZoneNotFound
}

func (c *Client) CaptainFinancialEligibility(ctx context.Context, actorID string) (CaptainFinancialEligibility, error) {
	var result CaptainFinancialEligibility
	operatorContextID, ok := workforceauth.OperatorContextIDFromContext(ctx)
	if !c.Configured() || !ok {
		return result, fmt.Errorf("DSH financial eligibility client is not configured")
	}
	endpoint := fmt.Sprintf(
		"%s/dsh/internal/workforce/captains/%s/financial-eligibility",
		c.baseURL,
		url.PathEscape(strings.TrimSpace(actorID)),
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return result, fmt.Errorf("build DSH financial eligibility request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Operator-Context-ID", operatorContextID)
	resp, err := c.http.Do(req)
	if err != nil {
		return result, fmt.Errorf("call DSH financial eligibility: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return result, fmt.Errorf("DSH financial eligibility returned HTTP %d", resp.StatusCode)
	}
	var envelope struct {
		FinancialEligibility CaptainFinancialEligibility `json:"financialEligibility"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return result, fmt.Errorf("decode DSH financial eligibility: %w", err)
	}
	result = envelope.FinancialEligibility
	if strings.TrimSpace(result.OperatorContextID) != "" && result.OperatorContextID != operatorContextID {
		return CaptainFinancialEligibility{}, fmt.Errorf("DSH financial eligibility context mismatch")
	}
	if strings.TrimSpace(result.CaptainID) == "" ||
		strings.TrimSpace(result.WltDecisionID) == "" ||
		strings.TrimSpace(result.WltPolicyVersion) == "" ||
		result.ExpiresAt.IsZero() {
		return CaptainFinancialEligibility{}, fmt.Errorf("DSH financial eligibility projection is incomplete")
	}
	return result, nil
}

type AvailabilityProjectionInput struct {
	OperatorContextID string    `json:"operatorContextId"`
	NoticeID          string    `json:"noticeId"`
	ActorType         string    `json:"actorType"`
	ActorID           string    `json:"actorId"`
	NoticeType        string    `json:"noticeType"`
	StartsAt          time.Time `json:"startsAt"`
	EndsAt            time.Time `json:"endsAt"`
	Status            string    `json:"status"`
	Reason            string    `json:"reason"`
	SourceVersion     int64     `json:"sourceVersion"`
	SourceUpdatedAt   time.Time `json:"sourceUpdatedAt"`
	IdempotencyKey    string    `json:"idempotencyKey"`
}

type AvailabilityProjectionResult struct {
	AvailabilityProjectionInput
	Idempotent bool `json:"idempotent"`
}

func AvailabilityProjectionIdempotencyKey(operatorContextID, noticeID string, sourceVersion int64) string {
	return fmt.Sprintf("workforce-availability-v1:%s:%s:%d", strings.TrimSpace(operatorContextID), strings.TrimSpace(noticeID), sourceVersion)
}

func prepareAvailabilityProjectionInput(ctx context.Context, input AvailabilityProjectionInput) (AvailabilityProjectionInput, error) {
	operatorContextID, ok := workforceauth.OperatorContextIDFromContext(ctx)
	if !ok {
		return AvailabilityProjectionInput{}, ErrUnavailable
	}
	if strings.TrimSpace(input.OperatorContextID) != "" && strings.TrimSpace(input.OperatorContextID) != operatorContextID {
		return AvailabilityProjectionInput{}, fmt.Errorf("operator context mismatch")
	}
	input.OperatorContextID = operatorContextID
	if input.SourceVersion < 1 {
		input.SourceVersion = 1
	}
	if input.SourceUpdatedAt.IsZero() {
		input.SourceUpdatedAt = time.Now().UTC()
	}
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		input.IdempotencyKey = AvailabilityProjectionIdempotencyKey(
			input.OperatorContextID, input.NoticeID, input.SourceVersion,
		)
	}
	if input.IdempotencyKey != AvailabilityProjectionIdempotencyKey(
		input.OperatorContextID, input.NoticeID, input.SourceVersion,
	) {
		return AvailabilityProjectionInput{}, fmt.Errorf("idempotency key does not match availability source identity")
	}
	return input, nil
}

func (c *Client) SyncAvailabilityProjection(ctx context.Context, input AvailabilityProjectionInput) error {
	_, err := c.SyncAvailabilityProjectionWithResult(ctx, input)
	return err
}

func (c *Client) SyncAvailabilityProjectionWithResult(ctx context.Context, input AvailabilityProjectionInput) (AvailabilityProjectionResult, error) {
	if !c.AvailabilityProjectionConfigured() {
		return AvailabilityProjectionResult{}, ErrUnavailable
	}
	input, err := prepareAvailabilityProjectionInput(ctx, input)
	if err != nil {
		return AvailabilityProjectionResult{}, err
	}
	encoded, err := json.Marshal(input)
	if err != nil {
		return AvailabilityProjectionResult{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/dsh/internal/workforce/availability-projections", bytes.NewReader(encoded))
	if err != nil {
		return AvailabilityProjectionResult{}, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Operator-Context-ID", input.OperatorContextID)
	req.Header.Set("Idempotency-Key", input.IdempotencyKey)
	req.Header.Set("X-Correlation-ID", input.IdempotencyKey)
	resp, err := c.http.Do(req)
	if err != nil {
		return AvailabilityProjectionResult{}, fmt.Errorf("%w: %w: %v", ErrAvailabilityOutcomeUnknown, ErrUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return AvailabilityProjectionResult{}, classifyAvailabilityResponseError(resp)
	}
	if resp.StatusCode == http.StatusNoContent {
		return AvailabilityProjectionResult{AvailabilityProjectionInput: input}, nil
	}
	result, err := decodeAvailabilityProjectionResult(resp.Body)
	if err != nil {
		return AvailabilityProjectionResult{}, err
	}
	if result.OperatorContextID != input.OperatorContextID || result.NoticeID != input.NoticeID ||
		result.SourceVersion != input.SourceVersion || result.IdempotencyKey != input.IdempotencyKey {
		return AvailabilityProjectionResult{}, fmt.Errorf("%w: acknowledgement identity does not match the request", ErrAvailabilityMalformed)
	}
	return result, nil
}

func (c *Client) ReconcileAvailabilityProjection(ctx context.Context, operatorContextID, idempotencyKey string) (AvailabilityProjectionResult, bool, error) {
	if !c.AvailabilityProjectionConfigured() {
		return AvailabilityProjectionResult{}, false, ErrUnavailable
	}
	operatorContextID = strings.TrimSpace(operatorContextID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if operatorContextID == "" || idempotencyKey == "" {
		return AvailabilityProjectionResult{}, false, ErrUnavailable
	}
	trustedContext, ok := workforceauth.OperatorContextIDFromContext(ctx)
	if !ok || trustedContext != operatorContextID {
		return AvailabilityProjectionResult{}, false, fmt.Errorf("operator context mismatch")
	}
	endpoint := c.baseURL + "/dsh/internal/workforce/availability-projections/" + url.PathEscape(idempotencyKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return AvailabilityProjectionResult{}, false, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Operator-Context-ID", operatorContextID)
	req.Header.Set("X-Correlation-ID", idempotencyKey+":readback")
	resp, err := c.http.Do(req)
	if err != nil {
		return AvailabilityProjectionResult{}, false, fmt.Errorf("%w: %w: %v", ErrAvailabilityOutcomeUnknown, ErrUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return AvailabilityProjectionResult{}, false, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return AvailabilityProjectionResult{}, false, classifyAvailabilityResponseError(resp)
	}
	result, err := decodeAvailabilityProjectionResult(resp.Body)
	if err != nil {
		return AvailabilityProjectionResult{}, false, err
	}
	if result.OperatorContextID != operatorContextID || result.IdempotencyKey != idempotencyKey {
		return AvailabilityProjectionResult{}, false, fmt.Errorf("%w: readback identity does not match the request", ErrAvailabilityMalformed)
	}
	return result, true, nil
}

func decodeAvailabilityProjectionResult(reader io.Reader) (AvailabilityProjectionResult, error) {
	var envelope struct {
		AvailabilityProjection *AvailabilityProjectionResult `json:"availabilityProjection"`
	}
	decoder := json.NewDecoder(io.LimitReader(reader, 1<<20))
	if err := decoder.Decode(&envelope); err != nil || envelope.AvailabilityProjection == nil {
		if err == nil {
			err = errors.New("availabilityProjection is missing")
		}
		return AvailabilityProjectionResult{}, fmt.Errorf("%w: %v", ErrAvailabilityMalformed, err)
	}
	result := *envelope.AvailabilityProjection
	if strings.TrimSpace(result.OperatorContextID) == "" || strings.TrimSpace(result.NoticeID) == "" ||
		result.SourceVersion < 1 || strings.TrimSpace(result.IdempotencyKey) == "" {
		return AvailabilityProjectionResult{}, fmt.Errorf("%w: acknowledgement is incomplete", ErrAvailabilityMalformed)
	}
	return result, nil
}

func classifyAvailabilityResponseError(resp *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	var envelope struct {
		Code string `json:"code"`
	}
	_ = json.Unmarshal(body, &envelope)
	code := strings.ToUpper(strings.TrimSpace(envelope.Code))
	if resp.StatusCode == http.StatusConflict && code == "STALE_SOURCE_VERSION" {
		return fmt.Errorf("%w: DSH returned HTTP %d", ErrAvailabilityStale, resp.StatusCode)
	}
	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized ||
		resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusConflict {
		if strings.Contains(code, "OPERATOR_CONTEXT") {
			return fmt.Errorf("%w: %s", ErrAvailabilityRejected, code)
		}
		return fmt.Errorf("%w: DSH returned HTTP %d (%s)", ErrAvailabilityRejected, resp.StatusCode, code)
	}
	return fmt.Errorf("%w: %w: DSH returned HTTP %d", ErrAvailabilityOutcomeUnknown, ErrUnavailable, resp.StatusCode)
}

// ValidateProviderDocumentMedia asks DSH, the media owner, to validate the
// reference before Workforce persists it in a provider profile.
func (c *Client) ValidateProviderDocumentMedia(ctx context.Context, actorID, actorRole, mediaRef string) error {
	if !c.Configured() || c.token == "" {
		return ErrUnavailable
	}
	operatorContextID, ok := workforceauth.OperatorContextIDFromContext(ctx)
	if !ok {
		return ErrUnavailable
	}
	payload, err := json.Marshal(struct {
		ActorID   string `json:"actorId"`
		ActorRole string `json:"actorRole"`
		MediaRef  string `json:"mediaRef"`
	}{actorID, actorRole, mediaRef})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/dsh/internal/workforce/provider-media-refs/validate", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Operator-Context-ID", operatorContextID)
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusBadRequest {
		return ErrProviderMediaInvalid
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%w: DSH returned HTTP %d", ErrUnavailable, resp.StatusCode)
	}
	return nil
}
