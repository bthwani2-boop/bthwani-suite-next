package identity

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var (
	ErrRefreshAlreadyRotated     = errors.New("refresh token was already rotated concurrently")
	ErrDeviceFingerprintRequired = errors.New("device fingerprint is required for this session")
	ErrDeviceFingerprintMismatch = errors.New("device fingerprint does not match the session")
)

// refreshConcurrencyWindow is deliberately short. The immediately preceding
// refresh token can only suppress compromise handling inside this window, and
// it can never mint another token pair. Older or non-adjacent replay still
// flows through Refresh(), which revokes and marks the session compromised.
const refreshConcurrencyWindow = 15 * time.Second

func deviceBoundSessionSurface(surface string) bool {
	switch strings.TrimSpace(surface) {
	case "app-client", "app-partner", "app-captain", "app-field":
		return true
	default:
		return false
	}
}

func deviceFingerprintMatches(stored, presented string) bool {
	stored = strings.TrimSpace(stored)
	presented = strings.TrimSpace(presented)
	if stored == "" || presented == "" || len(stored) != len(presented) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(stored), []byte(presented)) == 1
}

// RefreshGoverned remains the canonical public refresh primitive. Device-bound
// mobile surfaces fail closed when no fingerprint is supplied; non-device BFF
// surfaces keep their separately governed server-session policy.
func (r *Repository) RefreshGoverned(ctx context.Context, refreshToken string) (TokenPair, error) {
	return r.refreshGoverned(ctx, refreshToken, "")
}

// RefreshGovernedForDevice binds mobile refresh rotation to the fingerprint
// captured when Identity created the session. The check executes under the same
// cross-instance PostgreSQL advisory lock as replay/concurrency handling, so a
// mismatched device cannot race a legitimate rotation.
func (r *Repository) RefreshGovernedForDevice(ctx context.Context, refreshToken, deviceFingerprint string) (TokenPair, error) {
	return r.refreshGoverned(ctx, refreshToken, deviceFingerprint)
}

func (r *Repository) refreshGoverned(ctx context.Context, refreshToken, deviceFingerprint string) (TokenPair, error) {
	parts := strings.SplitN(refreshToken, ".", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" || strings.TrimSpace(parts[1]) == "" {
		return TokenPair{}, ErrInvalidRefresh
	}
	sessionID := parts[0]
	presentedHash := tokenHash(parts[1])

	lockTx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return TokenPair{}, err
	}
	defer func() { _ = lockTx.Rollback() }()

	if _, err := lockTx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		sessionID,
	); err != nil {
		return TokenPair{}, err
	}

	var currentHash, surface, storedFingerprint string
	var previousHash sql.NullString
	var rotatedAt sql.NullTime
	err = lockTx.QueryRowContext(ctx, `
		SELECT refresh_token_hash,
		       previous_refresh_token_hash,
		       refresh_rotated_at,
		       surface,
		       COALESCE(device_fingerprint, '')
		FROM identity_sessions
		WHERE id = $1
		  AND revoked_at IS NULL
		  AND refresh_expires_at > now()`, sessionID).Scan(
		&currentHash,
		&previousHash,
		&rotatedAt,
		&surface,
		&storedFingerprint,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return TokenPair{}, ErrInvalidRefresh
		}
		return TokenPair{}, err
	}

	if deviceBoundSessionSurface(surface) {
		presentedFingerprint := strings.TrimSpace(deviceFingerprint)
		if strings.TrimSpace(storedFingerprint) == "" || presentedFingerprint == "" {
			if _, revokeErr := lockTx.ExecContext(ctx, `
				UPDATE identity_sessions
				SET revoked_at = COALESCE(revoked_at, now()),
				    compromised_at = COALESCE(compromised_at, now())
				WHERE id = $1`, sessionID); revokeErr != nil {
				return TokenPair{}, revokeErr
			}
			if err := lockTx.Commit(); err != nil {
				return TokenPair{}, err
			}
			return TokenPair{}, ErrDeviceFingerprintRequired
		}
		if !deviceFingerprintMatches(storedFingerprint, presentedFingerprint) {
			if _, revokeErr := lockTx.ExecContext(ctx, `
				UPDATE identity_sessions
				SET revoked_at = COALESCE(revoked_at, now()),
				    compromised_at = COALESCE(compromised_at, now())
				WHERE id = $1`, sessionID); revokeErr != nil {
				return TokenPair{}, revokeErr
			}
			if err := lockTx.Commit(); err != nil {
				return TokenPair{}, err
			}
			return TokenPair{}, ErrDeviceFingerprintMismatch
		}
	}

	if currentHash != presentedHash && previousHash.Valid && previousHash.String == presentedHash && rotatedAt.Valid {
		age := r.now().Sub(rotatedAt.Time)
		if age >= 0 && age <= refreshConcurrencyWindow {
			if err := lockTx.Commit(); err != nil {
				return TokenPair{}, err
			}
			return TokenPair{}, ErrRefreshAlreadyRotated
		}
	}

	// Keep the advisory transaction open while the canonical Refresh primitive
	// performs the row-locked rotation or stale-replay compromise transaction on
	// another pooled connection. A second service instance cannot enter this
	// section for the same session until this transaction ends.
	pair, refreshErr := r.Refresh(ctx, refreshToken)
	if commitErr := lockTx.Commit(); refreshErr == nil && commitErr != nil {
		return TokenPair{}, commitErr
	}
	return pair, refreshErr
}
