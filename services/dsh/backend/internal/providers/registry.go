package providers

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strings"
	"time"
)

var (
	ErrProviderNotFound   = errors.New("provider not found or inactive")
	ErrProviderInMaintenance = errors.New("provider is currently in maintenance mode")
)

type ProviderConfig struct {
	ID              string
	Domain          string
	Capability      string
	Environment     string
	IsActive        bool
	IsMaintenance   bool
	SecretReference string
	TimeoutBudget   time.Duration
	RetryBudget     int
}

type Registry struct {
	db *sql.DB
}

func NewRegistry(db *sql.DB) *Registry {
	return &Registry{db: db}
}

// GetActiveProvider retrieves the configuration and resolves the secret, ensuring it is active and not in maintenance.
func (r *Registry) GetActiveProvider(ctx context.Context, domain, capability, environment string) (ProviderConfig, string, error) {
	var cfg ProviderConfig
	var timeoutMs int

	query := `
		SELECT id, domain, capability, environment, is_active, is_maintenance, secret_reference, timeout_budget_ms, retry_budget
		FROM dsh_platform_providers
		WHERE domain = $1 AND capability = $2 AND environment = $3
	`
	err := r.db.QueryRowContext(ctx, query, domain, capability, environment).Scan(
		&cfg.ID,
		&cfg.Domain,
		&cfg.Capability,
		&cfg.Environment,
		&cfg.IsActive,
		&cfg.IsMaintenance,
		&cfg.SecretReference,
		&timeoutMs,
		&cfg.RetryBudget,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ProviderConfig{}, "", ErrProviderNotFound
		}
		return ProviderConfig{}, "", err
	}

	if !cfg.IsActive {
		return ProviderConfig{}, "", ErrProviderNotFound
	}
	if cfg.IsMaintenance {
		return ProviderConfig{}, "", ErrProviderInMaintenance
	}

	cfg.TimeoutBudget = time.Duration(timeoutMs) * time.Millisecond

	resolvedSecret := r.resolveSecret(cfg.SecretReference)

	return cfg, resolvedSecret, nil
}

// resolveSecret handles 'env:KEY' to fetch the actual secret value safely without exposing it via API responses.
func (r *Registry) resolveSecret(reference string) string {
	reference = strings.TrimSpace(reference)
	if strings.HasPrefix(reference, "env:") {
		envKey := strings.TrimPrefix(reference, "env:")
		return os.Getenv(envKey)
	}
	// Fallback/Extensibility for other secret managers
	return ""
}
