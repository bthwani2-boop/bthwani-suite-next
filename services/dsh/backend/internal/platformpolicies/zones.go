package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// CreateZoneInput and UpdateZoneInput/CreateZone/UpdateZone were dropped from
// this package by the DSH infrastructure reconstruction without a migrated
// consumer; they are restored here byte-for-byte from their last known-good
// implementation because TestPostgresLifecycle (postgres_test.go) exercises
// the full zone → SLA → capacity → rollback → idempotency chain through them,
// and no replacement exists. HTTP mutation routes are intentionally not
// re-registered for these primitives here; the owning contract must provide
// the sole governed write path for any mutation that uses them.
type CreateZoneInput struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	CityCode    string `json:"cityCode"`
	Description string `json:"description,omitempty"`
}

type UpdateZoneInput struct {
	Name            *string `json:"name,omitempty"`
	Description     *string `json:"description,omitempty"`
	IsActive        *bool   `json:"isActive,omitempty"`
	ExpectedVersion int     `json:"expectedVersion"`
}

func CreateZone(
	ctx context.Context,
	db *sql.DB,
	input CreateZoneInput,
	mutation MutationContext,
) (Zone, error) {
	input.ID = strings.ToLower(strings.TrimSpace(input.ID))
	input.Name = strings.TrimSpace(input.Name)
	input.CityCode = strings.ToLower(strings.TrimSpace(input.CityCode))
	input.Description = strings.TrimSpace(input.Description)
	if input.Name == "" ||
		len(input.Name) > 160 ||
		input.CityCode == "" ||
		len(input.CityCode) > 80 ||
		len(input.Description) > 1000 ||
		!validMutation(mutation) {
		return Zone{}, ErrInvalid
	}

	return withIdempotency(
		ctx,
		db,
		mutation,
		"create-zone",
		input,
		func(tx *sql.Tx) (Zone, error) {
			var item Zone
			var err error
			if input.ID == "" {
				err = tx.QueryRowContext(ctx, `
					INSERT INTO dsh_platform_zones (name, city_code, description)
					VALUES ($1, $2, $3)
					RETURNING id, name, city_code, is_active, description,
					          version, created_at, updated_at`,
					input.Name,
					input.CityCode,
					input.Description,
				).Scan(
					&item.ID,
					&item.Name,
					&item.CityCode,
					&item.IsActive,
					&item.Description,
					&item.Version,
					&item.CreatedAt,
					&item.UpdatedAt,
				)
			} else {
				err = tx.QueryRowContext(ctx, `
					INSERT INTO dsh_platform_zones (id, name, city_code, description)
					VALUES ($1, $2, $3, $4)
					RETURNING id, name, city_code, is_active, description,
					          version, created_at, updated_at`,
					input.ID,
					input.Name,
					input.CityCode,
					input.Description,
				).Scan(
					&item.ID,
					&item.Name,
					&item.CityCode,
					&item.IsActive,
					&item.Description,
					&item.Version,
					&item.CreatedAt,
					&item.UpdatedAt,
				)
			}
			if err != nil {
				return Zone{}, err
			}
			if err := insertEvent(
				ctx,
				tx,
				"zone",
				item.ID,
				"created",
				mutation,
				nil,
				item.Version,
				item,
			); err != nil {
				return Zone{}, err
			}
			return item, nil
		},
	)
}

func UpdateZone(
	ctx context.Context,
	db *sql.DB,
	zoneID string,
	input UpdateZoneInput,
	mutation MutationContext,
) (Zone, error) {
	zoneID = strings.TrimSpace(zoneID)
	if zoneID == "" ||
		input.ExpectedVersion < 1 ||
		(input.Name == nil && input.Description == nil && input.IsActive == nil) ||
		!validMutation(mutation) {
		return Zone{}, ErrInvalid
	}
	if input.Name != nil {
		value := strings.TrimSpace(*input.Name)
		if value == "" || len(value) > 160 {
			return Zone{}, ErrInvalid
		}
		input.Name = &value
	}
	if input.Description != nil {
		value := strings.TrimSpace(*input.Description)
		if len(value) > 1000 {
			return Zone{}, ErrInvalid
		}
		input.Description = &value
	}

	return withIdempotency(
		ctx,
		db,
		mutation,
		"update-zone:"+zoneID,
		input,
		func(tx *sql.Tx) (Zone, error) {
			var before Zone
			err := tx.QueryRowContext(ctx, `
				SELECT id, name, city_code, is_active, description,
				       version, created_at, updated_at
				FROM dsh_platform_zones
				WHERE id = $1
				FOR UPDATE`, zoneID).Scan(
				&before.ID,
				&before.Name,
				&before.CityCode,
				&before.IsActive,
				&before.Description,
				&before.Version,
				&before.CreatedAt,
				&before.UpdatedAt,
			)
			if errors.Is(err, sql.ErrNoRows) {
				return Zone{}, ErrNotFound
			}
			if err != nil {
				return Zone{}, err
			}
			if before.Version != input.ExpectedVersion {
				return Zone{}, ErrVersionConflict
			}

			name := before.Name
			description := before.Description
			active := before.IsActive
			if input.Name != nil {
				name = *input.Name
			}
			if input.Description != nil {
				description = *input.Description
			}
			if input.IsActive != nil {
				active = *input.IsActive
			}

			var item Zone
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_zones
				SET name = $2,
				    description = $3,
				    is_active = $4,
				    version = version + 1,
				    updated_at = NOW()
				WHERE id = $1
				RETURNING id, name, city_code, is_active, description,
				          version, created_at, updated_at`,
				zoneID,
				name,
				description,
				active,
			).Scan(
				&item.ID,
				&item.Name,
				&item.CityCode,
				&item.IsActive,
				&item.Description,
				&item.Version,
				&item.CreatedAt,
				&item.UpdatedAt,
			)
			if err != nil {
				return Zone{}, err
			}

			action := "updated"
			if before.IsActive != item.IsActive {
				if item.IsActive {
					action = "activated"
				} else {
					action = "deactivated"
				}
			}
			if err := insertEvent(
				ctx,
				tx,
				"zone",
				item.ID,
				action,
				mutation,
				before.Version,
				item.Version,
				item,
			); err != nil {
				return Zone{}, err
			}
			return item, nil
		},
	)
}
