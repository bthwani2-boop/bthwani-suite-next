package dispatch

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	CaptainAvailabilityAvailable       = "available"
	CaptainAvailabilityUnavailable     = "unavailable"
	CaptainAvailabilityBreak           = "break"
	CaptainAvailabilityPlannedLeave    = "planned-leave"
	CaptainDispatchAvailabilityOnline  = "available"
	CaptainDispatchAvailabilityOffline = "offline"
)

type CaptainAvailability struct {
	Status    string    `json:"status"`
	Version   int       `json:"version"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type captainAvailabilityQuerier interface {
	QueryRow(query string, args ...any) *sql.Row
}

func GetCaptainAvailability(db *sql.DB, operatorContextID, captainID string) (*CaptainAvailability, error) {
	operatorContextID, captainID, err := normalizeCaptainAvailabilityIdentity(operatorContextID, captainID)
	if err != nil {
		return nil, err
	}
	return getCaptainAvailability(captainAvailabilityQuerier(db), operatorContextID, captainID)
}

func getCaptainAvailability(queryer captainAvailabilityQuerier, operatorContextID, captainID string) (*CaptainAvailability, error) {
	var dispatchStatus string
	var version int
	var updatedAt time.Time
	var noticeType sql.NullString
	err := queryer.QueryRow(`
		SELECT p.availability_status, p.version, p.updated_at,
		       (
		         SELECT lower(NULLIF(btrim(absence.notice_type), ''))
		         FROM dsh_provider_availability_projections absence
		         WHERE absence.operator_context_id = p.operator_context_id
		           AND absence.actor_type = 'captain'
		           AND absence.actor_id = p.captain_id
		           AND absence.status = 'active'
		           AND now() >= absence.starts_at
		           AND now() < absence.ends_at
		         ORDER BY absence.starts_at ASC
		         LIMIT 1
		       )
		FROM dsh_captain_dispatch_profiles p
		WHERE p.operator_context_id = $1 AND p.captain_id = $2
	`, operatorContextID, captainID).Scan(&dispatchStatus, &version, &updatedAt, &noticeType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCaptainProfileNotFound
		}
		return nil, err
	}

	return &CaptainAvailability{
		Status:    captainAvailabilityStatus(dispatchStatus, noticeType.String),
		Version:   version,
		UpdatedAt: updatedAt,
	}, nil
}

func SetCaptainAvailability(
	db *sql.DB,
	operatorContextID,
	captainID,
	actorID,
	status string,
	expectedVersion int,
	idempotencyKey,
	correlationID string,
) (*CaptainAvailability, error) {
	operatorContextID, captainID, err := normalizeCaptainAvailabilityIdentity(operatorContextID, captainID)
	if err != nil {
		return nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, fmt.Errorf("%w: actorId is required", ErrInvalid)
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return nil, fmt.Errorf("%w: Idempotency-Key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return nil, fmt.Errorf("%w: X-Correlation-ID must contain between 8 and 200 characters", ErrInvalid)
	}
	if expectedVersion < 1 {
		return nil, fmt.Errorf("%w: expectedVersion must be a positive integer", ErrInvalid)
	}

	dispatchStatus, err := normalizeCaptainDispatchAvailability(status)
	if err != nil {
		return nil, err
	}
	fingerprint := captainAvailabilityCommandFingerprint(
		operatorContextID,
		captainID,
		actorID,
		dispatchStatus,
		expectedVersion,
	)

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		operatorContextID+"|captain-availability|"+actorID+"|"+idempotencyKey,
	); err != nil {
		return nil, err
	}

	var storedCaptainID, storedFingerprint string
	receiptErr := tx.QueryRow(`
		SELECT captain_id, request_fingerprint
		FROM dsh_captain_availability_command_receipts
		WHERE operator_context_id = $1 AND actor_id = $2 AND idempotency_key = $3
		FOR UPDATE
	`, operatorContextID, actorID, idempotencyKey).Scan(&storedCaptainID, &storedFingerprint)
	if receiptErr == nil {
		if storedCaptainID != captainID || storedFingerprint != fingerprint {
			return nil, ErrIdempotencyConflict
		}
		availability, err := getCaptainAvailability(tx, operatorContextID, captainID)
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return availability, nil
	}
	if !errors.Is(receiptErr, sql.ErrNoRows) {
		return nil, receiptErr
	}

	var currentVersion int
	if err := tx.QueryRow(`
		SELECT version
		FROM dsh_captain_dispatch_profiles
		WHERE operator_context_id = $1 AND captain_id = $2
		FOR UPDATE
	`, operatorContextID, captainID).Scan(&currentVersion); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCaptainProfileNotFound
		}
		return nil, err
	}
	if expectedVersion != currentVersion {
		return nil, fmt.Errorf("%w: captain profile version changed", ErrConflict)
	}
	if dispatchStatus == CaptainDispatchAvailabilityOnline {
		var blocked bool
		if err := tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM dsh_provider_availability_projections
				WHERE operator_context_id = $1
				  AND actor_type = 'captain'
				  AND actor_id = $2
				  AND status = 'active'
				  AND now() >= starts_at
				  AND now() < ends_at
			)
		`, operatorContextID, captainID).Scan(&blocked); err != nil {
			return nil, err
		}
		if blocked {
			return nil, fmt.Errorf("%w: captain has an active Workforce unavailability notice", ErrConflict)
		}
	}

	result, err := tx.Exec(`
		UPDATE dsh_captain_dispatch_profiles
		SET availability_status = $3,
		    updated_by = $4,
		    version = version + 1,
		    updated_at = NOW()
		WHERE operator_context_id = $1
		  AND captain_id = $2
		  AND version = $5
	`, operatorContextID, captainID, dispatchStatus, actorID, expectedVersion)
	if err != nil {
		return nil, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected != 1 {
		return nil, fmt.Errorf("%w: captain profile version changed", ErrConflict)
	}

	availability, err := getCaptainAvailability(tx, operatorContextID, captainID)
	if err != nil {
		return nil, err
	}
	result, err = tx.Exec(`
		INSERT INTO dsh_captain_availability_command_receipts
			(operator_context_id, actor_id, captain_id, idempotency_key, request_fingerprint, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (operator_context_id, actor_id, idempotency_key) DO NOTHING
	`, operatorContextID, actorID, captainID, idempotencyKey, fingerprint, correlationID)
	if err != nil {
		return nil, err
	}
	if affected, err := result.RowsAffected(); err != nil {
		return nil, err
	} else if affected != 1 {
		if err := tx.QueryRow(`
			SELECT captain_id, request_fingerprint
			FROM dsh_captain_availability_command_receipts
			WHERE operator_context_id = $1 AND actor_id = $2 AND idempotency_key = $3
			FOR UPDATE
		`, operatorContextID, actorID, idempotencyKey).Scan(&storedCaptainID, &storedFingerprint); err != nil {
			return nil, err
		}
		if storedCaptainID != captainID || storedFingerprint != fingerprint {
			return nil, ErrIdempotencyConflict
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return availability, nil
}

func captainAvailabilityCommandFingerprint(
	operatorContextID,
	captainID,
	actorID,
	dispatchStatus string,
	expectedVersion int,
) string {
	value := strings.Join([]string{
		operatorContextID,
		captainID,
		actorID,
		dispatchStatus,
		fmt.Sprintf("%d", expectedVersion),
	}, "\x00")
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func normalizeCaptainAvailabilityIdentity(operatorContextID, captainID string) (string, string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	captainID = strings.TrimSpace(captainID)
	if operatorContextID == "" || captainID == "" {
		return "", "", fmt.Errorf("%w: operator context and captainId are required", ErrInvalid)
	}
	return operatorContextID, captainID, nil
}

func normalizeCaptainDispatchAvailability(status string) (string, error) {
	switch strings.TrimSpace(status) {
	case CaptainAvailabilityAvailable:
		return CaptainDispatchAvailabilityOnline, nil
	case CaptainAvailabilityUnavailable:
		return CaptainDispatchAvailabilityOffline, nil
	default:
		return "", fmt.Errorf("%w: captain may only set available or unavailable; Workforce owns absence states", ErrInvalid)
	}
}

func captainAvailabilityStatus(dispatchStatus, noticeType string) string {
	switch strings.ReplaceAll(strings.ToLower(strings.TrimSpace(noticeType)), "_", "-") {
	case "break", "rest":
		return CaptainAvailabilityBreak
	case "planned-leave", "leave", "vacation":
		return CaptainAvailabilityPlannedLeave
	}
	if dispatchStatus == CaptainDispatchAvailabilityOnline {
		return CaptainAvailabilityAvailable
	}
	return CaptainAvailabilityUnavailable
}
