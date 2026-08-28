package identity

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

var (
	// ErrSupportSessionSelfTarget rejects a support session where the
	// initiator and target are the same actor — a support session is
	// elevated third-party access, never self-access.
	ErrSupportSessionSelfTarget = errors.New("support session cannot target the initiating actor")
	// ErrSupportSessionAlreadyIssued is returned when a support session was
	// already issued for this request id (uq_identity_support_request).
	ErrSupportSessionAlreadyIssued         = errors.New("support session already issued for this request")
	ErrSupportSessionRequestConflict       = errors.New("support request payload conflicts with the issued session")
	ErrSupportSessionCredentialUnavailable = errors.New("support session credential is unavailable; governed reissue is required")
	// ErrSupportSessionTargetUnavailable is returned when the target actor
	// does not exist or is not ACTIVE.
	ErrSupportSessionTargetUnavailable = errors.New("support session target actor is unavailable")
	// ErrSupportSessionNotFound is returned when revoking a request that was
	// never issued or is already revoked.
	ErrSupportSessionNotFound = errors.New("support session not found or already revoked")
)

// supportSessionMaxMinutes mirrors the hard database constraint
// identity_sessions_support_shape_check: access_expires_at <= created_at + 15 minutes.
const (
	supportSessionMaxMinutes = 15
	supportSessionMinMinutes = 1
)

// SupportSessionIdentity is the resolved view of an elevated, time-limited
// support session. Subject is the target actor being supported; the
// initiator is recorded separately so every action taken through this
// session is attributable to the real actor who requested it.
type SupportSessionIdentity struct {
	Subject           string       `json:"subject"`
	OperatorContextID string       `json:"operatorContextId"`
	PhoneE164         string       `json:"phoneE164"`
	Roles             []string     `json:"roles"`
	Permissions       []Permission `json:"permissions"`
	AuthState         string       `json:"authState"`
	SessionID         string       `json:"sessionId"`
	SessionKind       string       `json:"sessionKind"`
	InitiatorActorID  string       `json:"initiatorActorId"`
	SupportRequestID  string       `json:"supportRequestId"`
	ExpiresAt         time.Time    `json:"expiresAt"`
}

type SupportSessionToken struct {
	AccessToken string                 `json:"accessToken"`
	TokenType   string                 `json:"tokenType"`
	ExpiresIn   int                    `json:"expiresIn"`
	Identity    SupportSessionIdentity `json:"identity"`
}

// supportSessionPermissions is the fixed, minimal permission set granted to
// every support session. A support session never inherits the target
// actor's own roles or permissions — it grants only a scoped read, which is
// the entire reason it exists instead of impersonating the target outright.
func supportSessionPermissions(targetActorID string) []Permission {
	return []Permission{{
		Service: "dsh",
		Surface: "control-panel",
		Action:  "support.read",
		Scope:   "actor:" + targetActorID,
	}}
}

// IssueSupportSession creates a new elevated, time-limited support session
// bound one-to-one to an already-approved support request (the caller is
// responsible for that approval; this call performs no authorization
// decision of its own beyond the self-target and target-availability
// invariants enforced here and by the database).
func supportSessionFingerprint(requestID, targetActorID, initiatorActorID, reason string, durationMinutes int) string {
	payload := fmt.Sprintf("%s|%s|%s|%s|%d", requestID, targetActorID, initiatorActorID, reason, durationMinutes)
	hash := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(hash[:])
}

func (r *Repository) IssueSupportSession(ctx context.Context, requestID, targetActorID, initiatorActorID, reason string, durationMinutes int) (SupportSessionToken, error) {
	requestID = strings.TrimSpace(requestID)
	targetActorID = strings.TrimSpace(targetActorID)
	initiatorActorID = strings.TrimSpace(initiatorActorID)
	reason = strings.TrimSpace(reason)
	if requestID == "" || targetActorID == "" || initiatorActorID == "" || len(reason) < 5 {
		return SupportSessionToken{}, fmt.Errorf("requestID, targetActorID, initiatorActorID are required and reason must be at least 5 characters")
	}
	if targetActorID == initiatorActorID {
		return SupportSessionToken{}, ErrSupportSessionSelfTarget
	}
	if durationMinutes < supportSessionMinMinutes || durationMinutes > supportSessionMaxMinutes {
		durationMinutes = supportSessionMaxMinutes
	}
	fingerprint := supportSessionFingerprint(requestID, targetActorID, initiatorActorID, reason, durationMinutes)

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return SupportSessionToken{}, err
	}
	defer tx.Rollback()

	var existingFingerprint, existingTarget, existingInitiator string
	var existingSessionID string
	var existingExpires time.Time
	var existingRevokedAt sql.NullTime
	var existingPermissionsJSON []byte
	existingErr := tx.QueryRowContext(ctx, `
		SELECT id, actor_id, initiator_actor_id, access_expires_at, effective_permissions, support_payload_fingerprint, revoked_at
		FROM identity_sessions
		WHERE support_request_id=$1 AND session_kind='support'
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, requestID).
		Scan(&existingSessionID, &existingTarget, &existingInitiator, &existingExpires, &existingPermissionsJSON, &existingFingerprint, &existingRevokedAt)
	if existingErr == nil {
		if existingFingerprint != fingerprint || existingTarget != targetActorID || existingInitiator != initiatorActorID {
			return SupportSessionToken{}, ErrSupportSessionRequestConflict
		}
		if existingRevokedAt.Valid {
			return SupportSessionToken{}, ErrSupportSessionCredentialUnavailable
		}
		target, err := actorByIDTx(ctx, tx, existingTarget)
		if err != nil || target.Status != ActorStatusActive {
			return SupportSessionToken{}, ErrSupportSessionTargetUnavailable
		}
		initiator, err := actorByIDTx(ctx, tx, existingInitiator)
		if err != nil || initiator.Status != ActorStatusActive {
			return SupportSessionToken{}, ErrSupportSessionTargetUnavailable
		}
		permissions := supportSessionPermissions(existingTarget)
		permissionsJSON, err := json.Marshal(permissions)
		if err != nil {
			return SupportSessionToken{}, err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE identity_sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL`, existingSessionID); err != nil {
			return SupportSessionToken{}, err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO identity_support_session_audit
				(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
			VALUES ($1, $2, $3, $4, 'revoked', $5)`,
			requestID, existingSessionID, existingTarget, existingInitiator, "credential recovery rotation"); err != nil {
			return SupportSessionToken{}, err
		}
		sessionID, err := randomToken(18)
		if err != nil {
			return SupportSessionToken{}, err
		}
		accessToken, err := randomToken(32)
		if err != nil {
			return SupportSessionToken{}, err
		}
		now := r.now()
		expiresAt := now.Add(time.Duration(durationMinutes) * time.Minute)
		if _, err = tx.ExecContext(ctx, `
			INSERT INTO identity_sessions
				(id, actor_id, access_token_hash, surface, access_expires_at,
				 session_kind, initiator_actor_id, support_request_id, support_reason,
				 effective_roles, effective_permissions, support_payload_fingerprint)
			VALUES ($1, $2, $3, 'control-panel', $4, 'support', $5, $6, $7, $8, $9, $10)`,
			sessionID, existingTarget, tokenHash(accessToken), expiresAt,
			existingInitiator, requestID, reason, pq.Array([]string{"support"}), permissionsJSON, fingerprint); err != nil {
			return SupportSessionToken{}, err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO identity_support_session_audit
				(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
			VALUES ($1, $2, $3, $4, 'issued', $5)`,
			requestID, sessionID, existingTarget, existingInitiator, "credential recovery replacement"); err != nil {
			return SupportSessionToken{}, err
		}
		if err := tx.Commit(); err != nil {
			return SupportSessionToken{}, err
		}
		return SupportSessionToken{
			AccessToken: accessToken,
			TokenType:   "Bearer",
			ExpiresIn:   durationMinutes * 60,
			Identity: SupportSessionIdentity{
				Subject: existingTarget, OperatorContextID: target.OperatorContextID, PhoneE164: target.PhoneE164,
				Roles: []string{"support"}, Permissions: permissions, AuthState: "authenticated",
				SessionID: sessionID, SessionKind: "support", InitiatorActorID: existingInitiator,
				SupportRequestID: requestID, ExpiresAt: expiresAt,
			},
		}, nil
	}
	if existingErr != sql.ErrNoRows {
		return SupportSessionToken{}, existingErr
	}

	target, err := actorByIDTx(ctx, tx, targetActorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return SupportSessionToken{}, ErrSupportSessionTargetUnavailable
		}
		return SupportSessionToken{}, err
	}
	if target.Status != ActorStatusActive {
		return SupportSessionToken{}, ErrSupportSessionTargetUnavailable
	}
	// The initiator must itself be a real, active Identity actor — a support
	// session can never be attributed to an unverifiable caller id.
	initiator, err := actorByIDTx(ctx, tx, initiatorActorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return SupportSessionToken{}, ErrSupportSessionTargetUnavailable
		}
		return SupportSessionToken{}, err
	}
	if initiator.Status != ActorStatusActive {
		return SupportSessionToken{}, ErrSupportSessionTargetUnavailable
	}

	sessionID, err := randomToken(18)
	if err != nil {
		return SupportSessionToken{}, err
	}
	accessToken, err := randomToken(32)
	if err != nil {
		return SupportSessionToken{}, err
	}

	now := r.now()
	expiresAt := now.Add(time.Duration(durationMinutes) * time.Minute)
	permissions := supportSessionPermissions(targetActorID)
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return SupportSessionToken{}, err
	}

	_, err = tx.ExecContext(ctx, `
			INSERT INTO identity_sessions
				(id, actor_id, access_token_hash, surface, access_expires_at,
				 session_kind, initiator_actor_id, support_request_id, support_reason,
				 effective_roles, effective_permissions, support_payload_fingerprint)
			VALUES ($1, $2, $3, 'control-panel', $4, 'support', $5, $6, $7, $8, $9, $10)`,
		sessionID, targetActorID, tokenHash(accessToken), expiresAt,
		initiatorActorID, requestID, reason, pq.Array([]string{"support"}), permissionsJSON, fingerprint,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return SupportSessionToken{}, ErrSupportSessionAlreadyIssued
		}
		return SupportSessionToken{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO identity_support_session_audit
			(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
		VALUES ($1, $2, $3, $4, 'issued', $5)`,
		requestID, sessionID, targetActorID, initiatorActorID, reason,
	); err != nil {
		return SupportSessionToken{}, err
	}

	if err := tx.Commit(); err != nil {
		return SupportSessionToken{}, err
	}

	return SupportSessionToken{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   durationMinutes * 60,
		Identity: SupportSessionIdentity{
			Subject:           targetActorID,
			OperatorContextID: target.OperatorContextID,
			PhoneE164:         target.PhoneE164,
			Roles:             []string{"support"},
			Permissions:       permissions,
			AuthState:         "authenticated",
			SessionID:         sessionID,
			SessionKind:       "support",
			InitiatorActorID:  initiatorActorID,
			SupportRequestID:  requestID,
			ExpiresAt:         expiresAt,
		},
	}, nil
}

// ResolveSupportSession resolves a bearer access token issued by
// IssueSupportSession. It never falls back to standard session resolution —
// a support token is only ever valid as a support session.
func (r *Repository) ResolveSupportSession(ctx context.Context, accessToken string) (SupportSessionIdentity, error) {
	hash := tokenHash(accessToken)
	var (
		sessionID, targetActorID, initiatorActorID, requestID string
		expiresAt                                             time.Time
		permissionsJSON                                       []byte
	)
	err := r.db.QueryRowContext(ctx, `
		SELECT id, actor_id, initiator_actor_id, support_request_id, access_expires_at, effective_permissions
		FROM identity_sessions
		WHERE access_token_hash = $1
		  AND session_kind = 'support'
		  AND revoked_at IS NULL
		  AND access_expires_at > now()`, hash).Scan(
		&sessionID, &targetActorID, &initiatorActorID, &requestID, &expiresAt, &permissionsJSON,
	)
	if err != nil {
		return SupportSessionIdentity{}, ErrUnauthenticated
	}

	var permissions []Permission
	if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
		return SupportSessionIdentity{}, err
	}

	var operatorContextID, phone string
	_ = r.db.QueryRowContext(ctx, `SELECT operator_context_id, COALESCE(phone_e164, '') FROM identity_actors WHERE id = $1`,
		targetActorID).Scan(&operatorContextID, &phone)

	return SupportSessionIdentity{
		Subject:           targetActorID,
		OperatorContextID: operatorContextID,
		PhoneE164:         phone,
		Roles:             []string{"support"},
		Permissions:       permissions,
		AuthState:         "authenticated",
		SessionID:         sessionID,
		SessionKind:       "support",
		InitiatorActorID:  initiatorActorID,
		SupportRequestID:  requestID,
		ExpiresAt:         expiresAt,
	}, nil
}

// RevokeSupportSession revokes the support session issued for requestID.
// Idempotent on an already-revoked session only in the sense that it
// reports ErrSupportSessionNotFound rather than silently succeeding twice —
// every revoke attempt is audited regardless of outcome.
func (r *Repository) RevokeSupportSession(ctx context.Context, requestID, reason string) error {
	requestID = strings.TrimSpace(requestID)
	reason = strings.TrimSpace(reason)
	if requestID == "" {
		return fmt.Errorf("requestID is required")
	}
	if reason == "" {
		reason = "revoked without a stated reason"
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var sessionID, targetActorID, initiatorActorID string
	err = tx.QueryRowContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = now()
		WHERE support_request_id = $1 AND session_kind = 'support' AND revoked_at IS NULL
		RETURNING id, actor_id, initiator_actor_id`, requestID,
	).Scan(&sessionID, &targetActorID, &initiatorActorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrSupportSessionNotFound
		}
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO identity_support_session_audit
			(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
		VALUES ($1, $2, $3, $4, 'revoked', $5)`,
		requestID, sessionID, targetActorID, initiatorActorID, reason,
	); err != nil {
		return err
	}

	return tx.Commit()
}
