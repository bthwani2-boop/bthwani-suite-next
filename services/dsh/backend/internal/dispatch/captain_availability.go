package dispatch

import (
	"database/sql"
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

func GetCaptainAvailability(db *sql.DB, operatorContextID, captainID string) (*CaptainAvailability, error) {
	operatorContextID, captainID, err := normalizeCaptainAvailabilityIdentity(operatorContextID, captainID)
	if err != nil {
		return nil, err
	}

	var dispatchStatus string
	var version int
	var updatedAt time.Time
	var noticeType sql.NullString
	err = db.QueryRow(`
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

func SetCaptainAvailability(db *sql.DB, operatorContextID, captainID, actorID, status string, expectedVersion int) (*CaptainAvailability, error) {
	operatorContextID, captainID, err := normalizeCaptainAvailabilityIdentity(operatorContextID, captainID)
	if err != nil {
		return nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, fmt.Errorf("%w: actorId is required", ErrInvalid)
	}

	dispatchStatus, err := normalizeCaptainDispatchAvailability(status)
	if err != nil {
		return nil, err
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

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
	if expectedVersion > 0 && expectedVersion != currentVersion {
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
		  AND ($5 = 0 OR version = $5)
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
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAvailability(db, operatorContextID, captainID)
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
