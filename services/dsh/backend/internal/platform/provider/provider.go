package provider

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Status string

const (
	StatusActive      Status = "ACTIVE"
	StatusDegraded    Status = "DEGRADED"
	StatusMaintenance Status = "MAINTENANCE"
	StatusUnknown     Status = "UNKNOWN"
)

type Provider struct {
	ID                  string
	Domain              string
	Capability          string
	Environment         string
	Status              Status
	SecretReferenceName *string
	Metadata            string
	LastHealthCheck     *time.Time
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetProvider(ctx context.Context, domain, capability, environment string) (*Provider, error) {
	query := `
		SELECT id, domain, capability, environment, status, secret_reference_name, metadata, last_health_check, created_at, updated_at
		FROM dsh_platform_providers
		WHERE domain = $1 AND capability = $2 AND environment = $3
	`
	var p Provider
	err := s.db.QueryRowContext(ctx, query, domain, capability, environment).Scan(
		&p.ID, &p.Domain, &p.Capability, &p.Environment, &p.Status,
		&p.SecretReferenceName, &p.Metadata, &p.LastHealthCheck, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("provider not found")
		}
		return nil, err
	}
	return &p, nil
}

func (s *Service) ListProviders(ctx context.Context) ([]Provider, error) {
	query := `
		SELECT id, domain, capability, environment, status, secret_reference_name, metadata, last_health_check, created_at, updated_at
		FROM dsh_platform_providers
		ORDER BY domain, capability, environment
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []Provider
	for rows.Next() {
		var p Provider
		if err := rows.Scan(
			&p.ID, &p.Domain, &p.Capability, &p.Environment, &p.Status,
			&p.SecretReferenceName, &p.Metadata, &p.LastHealthCheck, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, nil
}

func (s *Service) UpdateStatus(ctx context.Context, id string, status Status) error {
	res, err := s.db.ExecContext(ctx, `UPDATE dsh_platform_providers SET status = $1, updated_at = NOW() WHERE id = $2`, status, id)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("provider not found")
	}
	return nil
}
