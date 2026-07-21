package clientaddress

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("client address not found")
	ErrConflict = errors.New("client address conflict")
	ErrInvalid  = errors.New("invalid client address")
)

var phonePattern = regexp.MustCompile(`^\+[1-9][0-9]{7,14}$`)

type Address struct {
	ID                   string    `json:"id"`
	Label                string    `json:"label"`
	RecipientName        string    `json:"recipientName"`
	PhoneE164            string    `json:"phoneE164"`
	AddressLine          string    `json:"addressLine"`
	ServiceAreaCode      string    `json:"serviceAreaCode"`
	Building             *string   `json:"building"`
	Floor                *string   `json:"floor"`
	Unit                 *string   `json:"unit"`
	DeliveryInstructions *string   `json:"deliveryInstructions"`
	Latitude             *float64  `json:"latitude"`
	Longitude            *float64  `json:"longitude"`
	IsDefault            bool      `json:"isDefault"`
	Version              int       `json:"version"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type CreateInput struct {
	Label                string   `json:"label"`
	RecipientName        string   `json:"recipientName"`
	PhoneE164            string   `json:"phoneE164"`
	AddressLine          string   `json:"addressLine"`
	ServiceAreaCode      string   `json:"serviceAreaCode"`
	Building             *string  `json:"building"`
	Floor                *string  `json:"floor"`
	Unit                 *string  `json:"unit"`
	DeliveryInstructions *string  `json:"deliveryInstructions"`
	Latitude             *float64 `json:"latitude"`
	Longitude            *float64 `json:"longitude"`
	MakeDefault          bool     `json:"makeDefault"`
}

type UpdateInput struct {
	CreateInput
	ExpectedVersion int `json:"expectedVersion"`
}

type MutationContext struct {
	IdempotencyKey string
	CorrelationID  string
}

const addressColumns = `id, label, recipient_name, phone_e164, address_line, service_area_code,
	building, floor, unit, delivery_instructions, latitude, longitude, is_default, version, created_at, updated_at`

func trimOptional(value *string, max int) (*string, bool) {
	if value == nil {
		return nil, true
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, true
	}
	if len([]rune(trimmed)) > max {
		return nil, false
	}
	return &trimmed, true
}

func normalize(input CreateInput) (CreateInput, error) {
	input.Label = strings.TrimSpace(input.Label)
	input.RecipientName = strings.TrimSpace(input.RecipientName)
	input.PhoneE164 = strings.TrimSpace(input.PhoneE164)
	input.AddressLine = strings.TrimSpace(input.AddressLine)
	input.ServiceAreaCode = strings.TrimSpace(input.ServiceAreaCode)
	var ok bool
	if input.Building, ok = trimOptional(input.Building, 120); !ok {
		return CreateInput{}, ErrInvalid
	}
	if input.Floor, ok = trimOptional(input.Floor, 40); !ok {
		return CreateInput{}, ErrInvalid
	}
	if input.Unit, ok = trimOptional(input.Unit, 40); !ok {
		return CreateInput{}, ErrInvalid
	}
	if input.DeliveryInstructions, ok = trimOptional(input.DeliveryInstructions, 500); !ok {
		return CreateInput{}, ErrInvalid
	}
	if len([]rune(input.Label)) < 1 || len([]rune(input.Label)) > 80 ||
		len([]rune(input.RecipientName)) < 2 || len([]rune(input.RecipientName)) > 160 ||
		len([]rune(input.AddressLine)) < 5 || len([]rune(input.AddressLine)) > 500 ||
		len([]rune(input.ServiceAreaCode)) < 1 || len([]rune(input.ServiceAreaCode)) > 80 ||
		!phonePattern.MatchString(input.PhoneE164) {
		return CreateInput{}, ErrInvalid
	}
	if (input.Latitude == nil) != (input.Longitude == nil) {
		return CreateInput{}, ErrInvalid
	}
	if input.Latitude != nil && (*input.Latitude < -90 || *input.Latitude > 90 || *input.Longitude < -180 || *input.Longitude > 180) {
		return CreateInput{}, ErrInvalid
	}
	return input, nil
}

func scanAddress(scanner interface{ Scan(...any) error }) (*Address, error) {
	var address Address
	if err := scanner.Scan(
		&address.ID, &address.Label, &address.RecipientName, &address.PhoneE164,
		&address.AddressLine, &address.ServiceAreaCode, &address.Building, &address.Floor,
		&address.Unit, &address.DeliveryInstructions, &address.Latitude, &address.Longitude,
		&address.IsDefault, &address.Version, &address.CreatedAt, &address.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &address, nil
}

func List(ctx context.Context, db *sql.DB, clientID string) ([]Address, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+addressColumns+`
		FROM dsh_client_addresses
		WHERE client_id = $1 AND deleted_at IS NULL
		ORDER BY is_default DESC, updated_at DESC, id ASC`, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	addresses := make([]Address, 0)
	for rows.Next() {
		address, scanErr := scanAddress(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		addresses = append(addresses, *address)
	}
	return addresses, rows.Err()
}

func GetOwned(ctx context.Context, db *sql.DB, clientID, addressID string) (*Address, error) {
	address, err := scanAddress(db.QueryRowContext(ctx, `SELECT `+addressColumns+`
		FROM dsh_client_addresses
		WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL`, strings.TrimSpace(addressID), strings.TrimSpace(clientID)))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return address, err
}

func (address Address) CheckoutSnapshot() string {
	parts := []string{address.AddressLine}
	for _, value := range []*string{address.Building, address.Floor, address.Unit} {
		if value != nil && strings.TrimSpace(*value) != "" {
			parts = append(parts, strings.TrimSpace(*value))
		}
	}
	parts = append(parts, address.ServiceAreaCode, address.RecipientName, address.PhoneE164)
	if address.DeliveryInstructions != nil && strings.TrimSpace(*address.DeliveryInstructions) != "" {
		parts = append(parts, "instructions: "+strings.TrimSpace(*address.DeliveryInstructions))
	}
	return strings.Join(parts, " | ")
}

func lockClient(ctx context.Context, tx *sql.Tx, clientID string) error {
	_, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "dsh-client-address:"+clientID)
	return err
}

func recordEvent(ctx context.Context, tx *sql.Tx, addressID, clientID, action string, version int, correlationID string) error {
	_, err := tx.ExecContext(ctx, `INSERT INTO dsh_client_address_events
		(address_id, client_id, action, version, correlation_id, metadata)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), '{}'::jsonb)`,
		addressID, clientID, action, version, strings.TrimSpace(correlationID))
	return err
}

func Create(ctx context.Context, db *sql.DB, clientID string, raw CreateInput, mutation MutationContext) (*Address, bool, error) {
	input, err := normalize(raw)
	if err != nil || strings.TrimSpace(clientID) == "" || len(strings.TrimSpace(mutation.IdempotencyKey)) < 8 {
		return nil, false, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return nil, false, err
	}

	existing, err := scanAddress(tx.QueryRowContext(ctx, `SELECT `+addressColumns+`
		FROM dsh_client_addresses
		WHERE client_id = $1 AND create_idempotency_key = $2 AND deleted_at IS NULL`,
		clientID, strings.TrimSpace(mutation.IdempotencyKey)))
	if err == nil {
		if commitErr := tx.Commit(); commitErr != nil {
			return nil, false, commitErr
		}
		return existing, false, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	var activeCount int
	if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM dsh_client_addresses WHERE client_id = $1 AND deleted_at IS NULL`, clientID).Scan(&activeCount); err != nil {
		return nil, false, err
	}
	makeDefault := input.MakeDefault || activeCount == 0
	if makeDefault {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses SET is_default = FALSE, version = version + 1, updated_at = NOW()
			WHERE client_id = $1 AND deleted_at IS NULL AND is_default = TRUE`, clientID); err != nil {
			return nil, false, err
		}
	}
	address, err := scanAddress(tx.QueryRowContext(ctx, `INSERT INTO dsh_client_addresses
		(client_id, label, recipient_name, phone_e164, address_line, service_area_code, building, floor, unit,
		 delivery_instructions, latitude, longitude, is_default, create_idempotency_key)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING `+addressColumns,
		clientID, input.Label, input.RecipientName, input.PhoneE164, input.AddressLine,
		input.ServiceAreaCode, input.Building, input.Floor, input.Unit, input.DeliveryInstructions,
		input.Latitude, input.Longitude, makeDefault, strings.TrimSpace(mutation.IdempotencyKey)))
	if err != nil {
		return nil, false, err
	}
	if err := recordEvent(ctx, tx, address.ID, clientID, "created", address.Version, mutation.CorrelationID); err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return address, true, nil
}

func Update(ctx context.Context, db *sql.DB, clientID, addressID string, raw UpdateInput, correlationID string) (*Address, error) {
	input, err := normalize(raw.CreateInput)
	if err != nil || raw.ExpectedVersion < 1 || strings.TrimSpace(addressID) == "" {
		return nil, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return nil, err
	}
	var currentDefault bool
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT is_default, version FROM dsh_client_addresses
		WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL FOR UPDATE`, addressID, clientID).Scan(&currentDefault, &currentVersion); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if currentVersion != raw.ExpectedVersion {
		return nil, ErrConflict
	}
	makeDefault := currentDefault || input.MakeDefault
	if input.MakeDefault {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses SET is_default = FALSE, version = version + 1, updated_at = NOW()
			WHERE client_id = $1 AND id <> $2 AND deleted_at IS NULL AND is_default = TRUE`, clientID, addressID); err != nil {
			return nil, err
		}
	}
	address, err := scanAddress(tx.QueryRowContext(ctx, `UPDATE dsh_client_addresses SET
		label=$1, recipient_name=$2, phone_e164=$3, address_line=$4, service_area_code=$5,
		building=$6, floor=$7, unit=$8, delivery_instructions=$9, latitude=$10, longitude=$11,
		is_default=$12, version=version+1, updated_at=NOW()
		WHERE id=$13 AND client_id=$14 AND deleted_at IS NULL AND version=$15
		RETURNING `+addressColumns,
		input.Label, input.RecipientName, input.PhoneE164, input.AddressLine, input.ServiceAreaCode,
		input.Building, input.Floor, input.Unit, input.DeliveryInstructions, input.Latitude, input.Longitude,
		makeDefault, addressID, clientID, raw.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	if err := recordEvent(ctx, tx, address.ID, clientID, "updated", address.Version, correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return address, nil
}

func SetDefault(ctx context.Context, db *sql.DB, clientID, addressID, correlationID string) (*Address, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return nil, err
	}
	current, err := scanAddress(tx.QueryRowContext(ctx, `SELECT `+addressColumns+` FROM dsh_client_addresses
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL FOR UPDATE`, addressID, clientID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if current.IsDefault {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return current, nil
	}
	if _, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses SET is_default=FALSE, version=version+1, updated_at=NOW()
		WHERE client_id=$1 AND id<>$2 AND deleted_at IS NULL AND is_default=TRUE`, clientID, addressID); err != nil {
		return nil, err
	}
	address, err := scanAddress(tx.QueryRowContext(ctx, `UPDATE dsh_client_addresses SET is_default=TRUE, version=version+1, updated_at=NOW()
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL RETURNING `+addressColumns, addressID, clientID))
	if err != nil {
		return nil, err
	}
	if err := recordEvent(ctx, tx, address.ID, clientID, "defaulted", address.Version, correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return address, nil
}

func Delete(ctx context.Context, db *sql.DB, clientID, addressID string, expectedVersion int, correlationID string) error {
	if expectedVersion < 1 || strings.TrimSpace(addressID) == "" {
		return ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := lockClient(ctx, tx, clientID); err != nil {
		return err
	}
	var currentDefault bool
	var currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT is_default, version FROM dsh_client_addresses
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL FOR UPDATE`, addressID, clientID).Scan(&currentDefault, &currentVersion); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	if currentVersion != expectedVersion {
		return ErrConflict
	}
	result, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses SET deleted_at=NOW(), is_default=FALSE, version=version+1, updated_at=NOW()
		WHERE id=$1 AND client_id=$2 AND deleted_at IS NULL AND version=$3`, addressID, clientID, expectedVersion)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return ErrConflict
	}
	newVersion := expectedVersion + 1
	if currentDefault {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_client_addresses SET is_default=TRUE, version=version+1, updated_at=NOW()
			WHERE id=(SELECT id FROM dsh_client_addresses WHERE client_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC, id ASC LIMIT 1)`, clientID); err != nil {
			return err
		}
	}
	if err := recordEvent(ctx, tx, addressID, clientID, "deleted", newVersion, correlationID); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit client address delete: %w", err)
	}
	return nil
}
