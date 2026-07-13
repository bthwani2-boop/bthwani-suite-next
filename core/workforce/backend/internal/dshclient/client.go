package dshclient

import (
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
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c != nil && c.baseURL != ""
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
