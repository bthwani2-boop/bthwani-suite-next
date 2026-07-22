package providers

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
	provider.Parameters = sanitizeProviderParameters(provider.Parameters)
	return provider
}

func credentialsConfigured(credentials json.RawMessage) bool {
	trimmed := strings.TrimSpace(string(credentials))
	return trimmed != "" && trimmed != "null" && trimmed != "{}"
}

func decodeJSONObject(raw json.RawMessage) (map[string]any, error) {
	var object map[string]any
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

func validateHealthURL(value any) error {
	raw, ok := value.(string)
	if !ok || strings.TrimSpace(raw) == "" {
		return ErrInvalidInput
	}
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Hostname() == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return ErrInvalidInput
	}
	return nil
}

func validatePublicParameterValue(value any) error {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			if parameterKeyContainsSecret(key) {
				return ErrInvalidInput
			}
			if normalizedProviderKey(key) == "healthurl" {
				if err := validateHealthURL(child); err != nil {
					return err
				}
			}
			if err := validatePublicParameterValue(child); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range typed {
			if err := validatePublicParameterValue(child); err != nil {
				return err
			}
		}
	}
	return nil
}

func sanitizeHealthURL(value string) string {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil || parsed.Hostname() == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return ""
	}
	parsed.User = nil
	parsed.RawQuery = ""
	parsed.ForceQuery = false
	parsed.Fragment = ""
	return parsed.String()
}

func sanitizePublicParameterValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		sanitized := make(map[string]any, len(typed))
		for key, child := range typed {
			if parameterKeyContainsSecret(key) {
				continue
			}
			if normalizedProviderKey(key) == "healthurl" {
				healthURL, ok := child.(string)
				if !ok {
					continue
				}
				safeURL := sanitizeHealthURL(healthURL)
				if safeURL == "" {
					continue
				}
				sanitized[key] = safeURL
				continue
			}
			sanitized[key] = sanitizePublicParameterValue(child)
		}
		return sanitized
	case []any:
		sanitized := make([]any, 0, len(typed))
		for _, child := range typed {
			sanitized = append(sanitized, sanitizePublicParameterValue(child))
		}
		return sanitized
	default:
		return value
	}
}

func sanitizeProviderParameters(raw json.RawMessage) json.RawMessage {
	parameters, err := decodeJSONObject(raw)
	if err != nil {
		return nil
	}
	encoded, err := json.Marshal(sanitizePublicParameterValue(parameters))
	if err != nil {
		return nil
	}
	return encoded
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
		if err := validatePublicParameterValue(parameters); err != nil {
			return err
		}
	}
	return nil
}

func providerUpdateRequestHash(id string, input UpdateProviderInput) (string, error) {
	canonical := map[string]any{"providerId": id}
	if input.Active != nil {
		canonical["active"] = *input.Active
	}
	if input.Credentials != nil {
		credentials, err := decodeJSONObject(*input.Credentials)
		if err != nil {
			return "", err
		}
		canonical["credentials"] = credentials
	}
	if input.Parameters != nil {
		parameters, err := decodeJSONObject(*input.Parameters)
		if err != nil {
			return "", err
		}
		canonical["parameters"] = parameters
	}
	encoded, err := json.Marshal(canonical)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(encoded)
	return fmt.Sprintf("%x", digest[:]), nil
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

func (s *Service) UpdateProvider(
	ctx context.Context,
	id string,
	input UpdateProviderInput,
	op Operator,
	correlationID string,
	idempotencyKey string,
) (ExternalProvider, error) {
	if err := validateUpdateProviderInput(input); err != nil {
		return ExternalProvider{}, err
	}
	if strings.TrimSpace(id) == "" || strings.TrimSpace(op.ActorID) == "" || strings.TrimSpace(op.Role) == "" || strings.TrimSpace(correlationID) == "" || strings.TrimSpace(idempotencyKey) == "" {
		return ExternalProvider{}, ErrInvalidInput
	}
	requestHash, err := providerUpdateRequestHash(id, input)
	if err != nil {
		return ExternalProvider{}, err
	}
	return s.repo.UpdateProviderGoverned(ctx, id, input, GovernedProviderUpdate{
		ActorID:        op.ActorID,
		ActorRole:      op.Role,
		CorrelationID:  strings.TrimSpace(correlationID),
		IdempotencyKey: strings.TrimSpace(idempotencyKey),
		RequestHash:    requestHash,
	})
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
	if err != nil || parsed.Hostname() == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
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
