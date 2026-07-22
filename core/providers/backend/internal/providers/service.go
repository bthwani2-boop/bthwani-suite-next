package providers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var ErrInvalidInput = errors.New("invalid provider input")

type Operator struct {
	ActorID string
	Role    string
	Token   string
}

type Service struct {
	repo               *Repository
	healthClient       *http.Client
	now                func() time.Time
	allowedHealthHosts map[string]struct{}
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
		healthClient: &http.Client{
			Timeout: 4 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
		now:                time.Now,
		allowedHealthHosts: parseAllowedHealthHosts(os.Getenv("PROVIDERS_HEALTH_PROBE_ALLOWED_HOSTS")),
	}
}

func parseAllowedHealthHosts(raw string) map[string]struct{} {
	hosts := map[string]struct{}{}
	for _, value := range strings.Split(raw, ",") {
		host := strings.ToLower(strings.TrimSpace(value))
		if host != "" {
			hosts[host] = struct{}{}
		}
	}
	return hosts
}

func providerForRead(provider ExternalProvider) ExternalProvider {
	provider.CredentialConfigured = credentialsConfigured(provider.Credentials)
	provider.Credentials = nil
	return provider
}

func credentialsConfigured(credentials json.RawMessage) bool {
	trimmed := strings.TrimSpace(string(credentials))
	return trimmed != "" && trimmed != "null" && trimmed != "{}"
}

func decodeJSONObject(raw json.RawMessage) (map[string]json.RawMessage, error) {
	var object map[string]json.RawMessage
	if len(raw) == 0 || json.Unmarshal(raw, &object) != nil || object == nil {
		return nil, ErrInvalidInput
	}
	return object, nil
}

func normalizedProviderKey(key string) string {
	replacer := strings.NewReplacer("_", "", "-", "", ".", "", " ", "")
	return strings.ToLower(replacer.Replace(strings.TrimSpace(key)))
}

func parameterKeyContainsSecret(key string) bool {
	normalized := normalizedProviderKey(key)
	for _, sensitive := range []string{
		"secret",
		"password",
		"credential",
		"credentials",
		"token",
		"apikey",
		"privatekey",
		"authkey",
		"accountsid",
	} {
		if normalized == sensitive || strings.HasSuffix(normalized, sensitive) {
			return true
		}
	}
	return false
}

func validateUpdateProviderInput(input UpdateProviderInput) error {
	if input.Active == nil && input.Credentials == nil && input.Parameters == nil {
		return ErrInvalidInput
	}
	if input.Credentials != nil {
		if _, err := decodeJSONObject(*input.Credentials); err != nil {
			return err
		}
	}
	if input.Parameters != nil {
		parameters, err := decodeJSONObject(*input.Parameters)
		if err != nil {
			return err
		}
		for key := range parameters {
			if parameterKeyContainsSecret(key) {
				return ErrInvalidInput
			}
		}
	}
	return nil
}

func (s *Service) ListProviders(ctx context.Context, op Operator) ([]ExternalProvider, error) {
	providers, err := s.repo.ListProviders(ctx)
	if err != nil {
		return nil, err
	}
	for index := range providers {
		providers[index] = providerForRead(providers[index])
	}
	return providers, nil
}

func (s *Service) GetProvider(ctx context.Context, id string, op Operator) (ExternalProvider, error) {
	provider, err := s.repo.GetProvider(ctx, id)
	if err != nil {
		return ExternalProvider{}, err
	}
	return providerForRead(provider), nil
}

func (s *Service) UpdateProvider(ctx context.Context, id string, input UpdateProviderInput, op Operator, correlationID string) (ExternalProvider, error) {
	if err := validateUpdateProviderInput(input); err != nil {
		return ExternalProvider{}, err
	}

	before, err := s.repo.GetProvider(ctx, id)
	if err != nil {
		return ExternalProvider{}, err
	}

	after, err := s.repo.UpdateProvider(ctx, id, input)
	if err != nil {
		return ExternalProvider{}, err
	}

	if err := s.repo.RecordAudit(ctx, op.ActorID, op.Role, id,
		"provider.configured", providerForRead(before), providerForRead(after), "", correlationID); err != nil {
		log.Printf("[providers] RecordAudit error in UpdateProvider: %v", err)
	}

	return providerForRead(after), nil
}

type healthProbeParameters struct {
	HealthURL string `json:"healthUrl"`
}

func (s *Service) GetHealth(ctx context.Context) (ExternalProviderHealthResponse, error) {
	list, err := s.repo.ListProviders(ctx)
	if err != nil {
		return ExternalProviderHealthResponse{}, err
	}

	kinds := []string{"sms", "maps", "payment", "push", "email", "storage", "search", "fraud"}
	items := make([]ExternalProviderHealthItem, 0, len(kinds))
	for _, kind := range kinds {
		items = append(items, s.healthForKind(ctx, kind, list))
	}
	return ExternalProviderHealthResponse{Providers: items}, nil
}

func (s *Service) healthForKind(ctx context.Context, kind string, providers []ExternalProvider) ExternalProviderHealthItem {
	checkedAt := s.now().UTC()
	hasConfigured := false
	hasActive := false
	bestStatus := StatusNotConfigured
	message := "No provider configured for this service"

	for _, provider := range providers {
		if provider.Kind != kind {
			continue
		}
		hasConfigured = true
		if !provider.Active {
			continue
		}
		hasActive = true
		status, probeMessage := s.probeProviderHealth(ctx, provider)
		if status == StatusHealthy {
			return ExternalProviderHealthItem{Kind: kind, Status: string(status), CheckedAt: checkedAt, Message: probeMessage}
		}
		if bestStatus != StatusDegraded || status == StatusDegraded {
			bestStatus = status
			message = probeMessage
		}
	}

	if !hasConfigured {
		return ExternalProviderHealthItem{Kind: kind, Status: string(StatusNotConfigured), CheckedAt: checkedAt, Message: message}
	}
	if !hasActive {
		return ExternalProviderHealthItem{Kind: kind, Status: string(StatusDegraded), CheckedAt: checkedAt, Message: "Configured providers are inactive"}
	}
	return ExternalProviderHealthItem{Kind: kind, Status: string(bestStatus), CheckedAt: checkedAt, Message: message}
}

func (s *Service) probeProviderHealth(ctx context.Context, provider ExternalProvider) (ExternalProviderStatus, string) {
	var parameters healthProbeParameters
	if len(provider.Parameters) > 0 {
		if err := json.Unmarshal(provider.Parameters, &parameters); err != nil {
			return StatusDegraded, "Provider health probe configuration is invalid"
		}
	}
	probeURL := strings.TrimSpace(parameters.HealthURL)
	if probeURL == "" {
		return StatusDegraded, "Active provider has no governed health probe"
	}
	parsed, err := url.Parse(probeURL)
	if err != nil || parsed.Hostname() == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.User != nil {
		return StatusDegraded, "Provider health probe URL is invalid"
	}
	host := strings.ToLower(parsed.Hostname())
	if _, allowed := s.allowedHealthHosts[host]; !allowed {
		return StatusDegraded, "Provider health probe host is not allowlisted"
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return StatusDegraded, "Provider health probe request is invalid"
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "bthwani-providers-health/1")
	response, err := s.healthClient.Do(request)
	if err != nil {
		return StatusDown, "Provider health probe failed"
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	if response.StatusCode >= http.StatusOK && response.StatusCode < http.StatusMultipleChoices {
		return StatusHealthy, fmt.Sprintf("Active provider %s passed its health probe", provider.Code)
	}
	return StatusDown, fmt.Sprintf("Active provider %s health probe returned HTTP %d", provider.Code, response.StatusCode)
}

type ExternalProviderStatus string

const (
	StatusHealthy       ExternalProviderStatus = "healthy"
	StatusDegraded      ExternalProviderStatus = "degraded"
	StatusDown          ExternalProviderStatus = "down"
	StatusNotConfigured ExternalProviderStatus = "not_configured"
)
