package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var ErrRefreshAlreadyRotated = errors.New("refresh token was already rotated concurrently")

// refreshConcurrencyWindow is deliberately short. The immediately preceding
// refresh token can only suppress compromise handling inside this window, and
// it can never mint another token pair. Older or non-adjacent replay still
// flows through Refresh(), which revokes and marks the session compromised.
const refreshConcurrencyWindow = 15 * time.Second

// RefreshGoverned is the distributed coordination boundary for the public
// refresh endpoint. PostgreSQL advisory locking serializes refresh attempts by
// session id across all Identity API instances. The underlying Refresh method
// remains the sole rotation/replay authority.
func (r *Repository) RefreshGoverned(ctx context.Context, refreshToken string) (TokenPair, error) {
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
	defer lockTx.Rollback()

	var lockAcquired int
	if err := lockTx.QueryRowContext(
		ctx,
		`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended($1, 0))`,
		sessionID,
	).Scan(&lockAcquired); err != nil {
		return TokenPair{}, err
	}
	if lockAcquired != 1 {
		return TokenPair{}, errors.New("refresh advisory lock was not acquired")
	}

	var currentHash string
	var previousHash sql.NullString
	var rotatedAt sql.NullTime
	err = lockTx.QueryRowContext(ctx, `
		SELECT refresh_token_hash, previous_refresh_token_hash, refresh_rotated_at
		FROM identity_sessions
		WHERE id = $1
		  AND revoked_at IS NULL
		  AND refresh_expires_at > now()`, sessionID).Scan(&currentHash, &previousHash, &rotatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return TokenPair{}, ErrInvalidRefresh
		}
		return TokenPair{}, err
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
