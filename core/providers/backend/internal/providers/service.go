package providers

import (
	"context"
	"fmt"
	"log"
	"time"
)

type Operator struct {
	ActorID string
	Role    string
	Token   string
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListProviders(ctx context.Context, op Operator) ([]ExternalProvider, error) {
	return s.repo.ListProviders(ctx)
}

func (s *Service) GetProvider(ctx context.Context, id string, op Operator) (ExternalProvider, error) {
	return s.repo.GetProvider(ctx, id)
}

func (s *Service) UpdateProvider(ctx context.Context, id string, input UpdateProviderInput, op Operator, correlationID string) (ExternalProvider, error) {
	before, err := s.repo.GetProvider(ctx, id)
	if err != nil {
		return ExternalProvider{}, err
	}

	after, err := s.repo.UpdateProvider(ctx, id, input)
	if err != nil {
		return ExternalProvider{}, err
	}

	if err := s.repo.RecordAudit(ctx, op.ActorID, op.Role, id,
		"provider.configured", before, after, "", correlationID); err != nil {
		log.Printf("[providers] RecordAudit error in UpdateProvider: %v", err)
	}

	return after, nil
}

func (s *Service) GetHealth(ctx context.Context) (ExternalProviderHealthResponse, error) {
	list, err := s.repo.ListProviders(ctx)
	if err != nil {
		return ExternalProviderHealthResponse{}, err
	}

	// Map each distinct kind to its most active provider state
	statusMap := map[string]ExternalProviderStatus{}
	messageMap := map[string]string{}

	// Initialize default kinds
	kinds := []string{"sms", "maps", "payment", "push", "email", "storage", "search", "fraud"}
	for _, k := range kinds {
		statusMap[k] = "not_configured"
		messageMap[k] = "No provider configured for this service"
	}

	for _, p := range list {
		if p.Active {
			statusMap[p.Kind] = "healthy"
			messageMap[p.Kind] = fmt.Sprintf("Active provider: %s", p.Code)
		} else if statusMap[p.Kind] == "not_configured" {
			statusMap[p.Kind] = "degraded"
			messageMap[p.Kind] = fmt.Sprintf("Provider %s is inactive", p.Code)
		}
	}

	items := []ExternalProviderHealthItem{}
	for _, k := range kinds {
		items = append(items, ExternalProviderHealthItem{
			Kind:      k,
			Status:    string(statusMap[k]),
			CheckedAt: time.Now(),
			Message:   messageMap[k],
		})
	}

	return ExternalProviderHealthResponse{Providers: items}, nil
}

type ExternalProviderStatus string

const (
	StatusHealthy       ExternalProviderStatus = "healthy"
	StatusDegraded      ExternalProviderStatus = "degraded"
	StatusDown          ExternalProviderStatus = "down"
	StatusNotConfigured ExternalProviderStatus = "not_configured"
)
