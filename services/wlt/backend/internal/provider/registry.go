package provider

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strings"
	"time"
)

var (
	ErrProviderNotFound      = errors.New("provider not found or inactive")
	ErrProviderInMaintenance = errors.New("provider is currently in maintenance mode")
)

type ProviderConfig struct {
	ID              string
	ProviderType    string
	Environment     string
	IsActive        bool
	IsMaintenance   bool
	SecretReference string
	TimeoutBudget   time.Duration
}

type Registry struct {
	db *sql.DB
}

func NewRegistry(db *sql.DB) *Registry {
	return &Registry{db: db}
}

// GetActiveProvider retrieves the configuration and resolves the secret.
func (r *Registry) GetActiveProvider(ctx context.Context, providerType, environment string) (ProviderConfig, string, error) {
	var cfg ProviderConfig
	var timeoutMs int

	query := `
		SELECT id, provider_type, environment, is_active, is_maintenance, secret_reference, timeout_budget_ms
		FROM wlt_financial_providers
		WHERE provider_type = $1 AND environment = $2
	`
	err := r.db.QueryRowContext(ctx, query, providerType, environment).Scan(
		&cfg.ID,
		&cfg.ProviderType,
		&cfg.Environment,
		&cfg.IsActive,
		&cfg.IsMaintenance,
		&cfg.SecretReference,
		&timeoutMs,
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

// resolveSecret handles 'env:KEY'.
func (r *Registry) resolveSecret(reference string) string {
	reference = strings.TrimSpace(reference)
	if strings.HasPrefix(reference, "env:") {
		envKey := strings.TrimPrefix(reference, "env:")
		return os.Getenv(envKey)
	}
	return ""
}
