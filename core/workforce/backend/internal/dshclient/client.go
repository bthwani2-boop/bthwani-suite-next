package dshclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var (
	ErrZoneNotFound = errors.New("zone not found")
	ErrZoneInactive = errors.New("zone is inactive")
	ErrUnavailable  = errors.New("dsh-api is unavailable")
)

type Client struct {
	baseURL  string
	token    string
	tenantID string
	http     *http.Client
}

// NewClient accepts the service token and tenant as optional arguments to keep
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
	if len(optional) > 1 {
		client.tenantID = strings.TrimSpace(optional[1])
	}
	return client
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
}

func (c *Client) AvailabilityProjectionConfigured() bool {
	return c.Configured() && c.token != "" && c.tenantID != ""
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

type AvailabilityProjectionInput struct {
	TenantID        string    `json:"tenantId"`
	NoticeID        string    `json:"noticeId"`
	ActorType       string    `json:"actorType"`
	ActorID         string    `json:"actorId"`
	NoticeType      string    `json:"noticeType"`
	StartsAt        time.Time `json:"startsAt"`
	EndsAt          time.Time `json:"endsAt"`
	Status          string    `json:"status"`
	Reason          string    `json:"reason"`
	SourceUpdatedAt time.Time `json:"sourceUpdatedAt"`
}

func (c *Client) SyncAvailabilityProjection(ctx context.Context, input AvailabilityProjectionInput) error {
	if !c.AvailabilityProjectionConfigured() {
		return ErrUnavailable
	}
	input.TenantID = c.tenantID
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
