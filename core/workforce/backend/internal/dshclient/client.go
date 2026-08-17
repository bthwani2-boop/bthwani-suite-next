package dshclient

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

	workforceauth "workforce-api/internal/auth"
)

var (
	ErrZoneNotFound         = errors.New("zone not found")
	ErrZoneInactive         = errors.New("zone is inactive")
	ErrUnavailable          = errors.New("dsh-api is unavailable")
	ErrProviderMediaInvalid = errors.New("provider media reference is invalid")
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

// NewClient accepts the service token and operator context as optional arguments to keep
// compatibility with existing zone-validation tests while enabling the
// authenticated Workforce -> DSH availability projection channel.
func NewClient(baseURL string, optional ...string) *Client {
	client := &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		http:    &http.Client{Timeout: 10 * time.Second},
	}
	if len(optional) > 0 {
		client.token = strings.TrimSpace(optional[0])
	}
	return client
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
}

func (c *Client) AvailabilityProjectionConfigured() bool {
	return c.Configured() && c.token != ""
}

type Zone struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CityCode    string `json:"cityCode"`
	IsActive    bool   `json:"isActive"`
	Description string `json:"description"`
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
	SourceUpdatedAt   time.Time `json:"sourceUpdatedAt"`
}

func (c *Client) SyncAvailabilityProjection(ctx context.Context, input AvailabilityProjectionInput) error {
	if !c.AvailabilityProjectionConfigured() {
		return ErrUnavailable
	}
	operatorContextID, ok := workforceauth.OperatorContextIDFromContext(ctx)
	if !ok {
		return ErrUnavailable
	}
	if strings.TrimSpace(input.OperatorContextID) != "" && strings.TrimSpace(input.OperatorContextID) != operatorContextID {
		return fmt.Errorf("operator context mismatch")
	}
	input.OperatorContextID = operatorContextID
	encoded, err := json.Marshal(input)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/dsh/internal/workforce/availability-projections", bytes.NewReader(encoded))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("X-Service-Caller", "workforce")
	req.Header.Set("X-Correlation-ID", "workforce-availability:"+input.NoticeID)
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("DSH availability projection returned HTTP %d", resp.StatusCode)
	}
	return nil
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
