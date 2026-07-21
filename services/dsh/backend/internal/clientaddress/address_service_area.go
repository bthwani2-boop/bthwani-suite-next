package clientaddress

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"dsh-api/internal/servicearea"
)

var ErrServiceAreaUnverified = errors.New("client address service area is not verified")

// FindCreateReplay preserves the existing create idempotency contract before
// performing a fresh geofence verification. A successful prior create remains
// replayable even if the governed service-area configuration later changes.
func FindCreateReplay(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	idempotencyKey string,
) (*Address, bool, error) {
	clientID = strings.TrimSpace(clientID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if clientID == "" || len(idempotencyKey) < 8 {
		return nil, false, ErrInvalid
	}
	address, err := scanAddress(db.QueryRowContext(ctx, `SELECT `+addressColumns+`
		FROM dsh_client_addresses
		WHERE client_id = $1 AND create_idempotency_key = $2 AND deleted_at IS NULL`,
		clientID, idempotencyKey))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return address, true, nil
}

// ValidateServiceArea ensures that an active address is backed by coordinates
// that currently resolve to the same active DSH-owned service-area geofence.
func ValidateServiceArea(
	ctx context.Context,
	db *sql.DB,
	raw CreateInput,
) error {
	input, err := normalize(raw)
	if err != nil {
		return err
	}
	if input.Latitude == nil || input.Longitude == nil {
		return ErrServiceAreaUnverified
	}
	resolution, err := servicearea.Resolve(
		ctx,
		db,
		*input.Latitude,
		*input.Longitude,
	)
	if errors.Is(err, servicearea.ErrInvalid) {
		return ErrInvalid
	}
	if err != nil {
		return err
	}
	if !resolution.Verified ||
		!strings.EqualFold(
			strings.TrimSpace(resolution.ServiceAreaCode),
			strings.TrimSpace(input.ServiceAreaCode),
		) {
		return ErrServiceAreaUnverified
	}
	return nil
}
