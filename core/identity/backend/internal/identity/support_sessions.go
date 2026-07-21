package identity

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

var (
	ErrSupportSessionInvalid  = errors.New("invalid support session request")
	ErrSupportSessionConflict = errors.New("support session request conflict")
	ErrSupportSessionForbidden = errors.New("support session actors must be distinct and active")
)

func deterministicSupportToken(secret string, requestID string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte("identity-support-session:" + requestID))
	return "idsupport_" + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func supportPermission(targetActorID string) []Permission {
	return []Permission{{
		Service: "dsh",
		Surface: "control-panel",
		Action:  "support.read",
		Scope:   "actor:" + targetActorID,
	}}
}

func buildSupportIdentity(
	target Actor,
	sessionID string,
	initiatorActorID string,
	requestID string,
	expiresAt time.Time,
) ActorIdentity {
	permissions := supportPermission(target.ID)
	return ActorIdentity{
		Subject:          target.ID,
		TenantID:         target.TenantID,
		PhoneE164:        target.PhoneE164,
		Roles:            []string{"support-session"},
		Permissions:      permissions,
		AuthState:        "authenticated",
		SurfaceAccess:    map[string]bool{"control-panel": true},
		ServiceAccess:    map[string]bool{"dsh": true},
		SessionID:        sessionID,
		SessionKind:      "support",
		InitiatorActorID: initiatorActorID,
		SupportRequestID: requestID,
		ExpiresAt:        expiresAt,
	}
}

func (r *Repository) closeExpiredSupportSessions(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `
		WITH expired AS (
			UPDATE identity_sessions
			SET status = 'revoked'
			WHERE session_kind = 'support'
			  AND status = 'active'
			  AND access_expires_at <= NOW()
			RETURNING id, support_request_id, actor_id, initiator_actor_id, support_reason
		)
		INSERT INTO identity_support_session_audit
			(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
		SELECT support_request_id, id, actor_id, initiator_actor_id, 'expired', support_reason
		FROM expired`)
	return err
}

// IssueSupportSession creates or deterministically replays one access-only,
// read-only support session. Identity remains the sole session authority.
func (r *Repository) IssueSupportSession(
	ctx context.Context,
	input SupportSessionInput,
	tokenSecret string,
) (SupportSessionToken, error) {
	input.SupportRequestID = strings.TrimSpace(input.SupportRequestID)
	input.TargetActorID = strings.TrimSpace(input.TargetActorID)
	input.InitiatorActorID = strings.TrimSpace(input.InitiatorActorID)
	input.Reason = strings.TrimSpace(input.Reason)
	tokenSecret = strings.TrimSpace(tokenSecret)
	if r == nil || r.db == nil || input.SupportRequestID == "" || input.TargetActorID == "" ||
		input.InitiatorActorID == "" || input.TargetActorID == input.InitiatorActorID ||
		len(input.Reason) < 5 || input.Duration < time.Minute || input.Duration > 15*time.Minute ||
		len(tokenSecret) < 32 {
		return SupportSessionToken{}, ErrSupportSessionInvalid
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return SupportSessionToken{}, err
	}
	defer tx.Rollback()
	if err := r.closeExpiredSupportSessions(ctx, tx); err != nil {
		return SupportSessionToken{}, err
	}

	var target Actor
	var targetRolesJSON, targetPermissionsJSON []byte
	err = tx.QueryRowContext(ctx, `
		SELECT id, username, password_hash, tenant_id, phone_e164, roles, permissions, active
		FROM identity_actors
		WHERE id = $1
		FOR SHARE`, input.TargetActorID).Scan(
		&target.ID,
		&target.Username,
		&target.PasswordHash,
		&target.TenantID,
		&target.PhoneE164,
		&targetRolesJSON,
		&targetPermissionsJSON,
		&target.Active,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return SupportSessionToken{}, ErrSupportSessionForbidden
	}
	if err != nil {
		return SupportSessionToken{}, err
	}
	var initiatorActive bool
	if err := tx.QueryRowContext(ctx, `SELECT active FROM identity_actors WHERE id = $1 FOR SHARE`, input.InitiatorActorID).Scan(&initiatorActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SupportSessionToken{}, ErrSupportSessionForbidden
		}
		return SupportSessionToken{}, err
	}
	if !target.Active || !initiatorActive {
		return SupportSessionToken{}, ErrSupportSessionForbidden
	}

	accessToken := deterministicSupportToken(tokenSecret, input.SupportRequestID)
	accessHash := hashToken(accessToken)
	permissions := supportPermission(target.ID)
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return SupportSessionToken{}, err
	}

	var sessionID, existingTargetID, existingInitiatorID, existingReason, storedHash, status string
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT, actor_id, initiator_actor_id, support_reason,
		       access_token_hash, status, access_expires_at
		FROM identity_sessions
		WHERE support_request_id = $1 AND session_kind = 'support'
		FOR UPDATE`, input.SupportRequestID).Scan(
		&sessionID,
		&existingTargetID,
		&existingInitiatorID,
		&existingReason,
		&storedHash,
		&status,
		&expiresAt,
	)
	if err == nil {
		if existingTargetID != input.TargetActorID || existingInitiatorID != input.InitiatorActorID ||
			existingReason != input.Reason || storedHash != accessHash || status != "active" || !expiresAt.After(time.Now().UTC()) {
			return SupportSessionToken{}, ErrSupportSessionConflict
		}
		if err := tx.Commit(); err != nil {
			return SupportSessionToken{}, err
		}
		identity := buildSupportIdentity(target, sessionID, input.InitiatorActorID, input.SupportRequestID, expiresAt)
		return SupportSessionToken{
			AccessToken: accessToken,
			TokenType:   "Bearer",
			ExpiresIn:   max(0, int(time.Until(expiresAt).Seconds())),
			Identity:    identity,
		}, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return SupportSessionToken{}, err
	}

	expiresAt = time.Now().UTC().Add(input.Duration)
	err = tx.QueryRowContext(ctx, `
		INSERT INTO identity_sessions
			(actor_id, access_token_hash, refresh_token_hash,
			 access_expires_at, refresh_expires_at, device_fingerprint,
			 status, session_kind, initiator_actor_id, support_request_id,
			 support_reason, effective_roles, effective_permissions)
		VALUES ($1, $2, NULL, $3, NULL, $4, 'active', 'support', $5, $6, $7, $8, $9::jsonb)
		RETURNING id::TEXT`,
		input.TargetActorID,
		accessHash,
		expiresAt,
		"support:"+input.SupportRequestID,
		input.InitiatorActorID,
		input.SupportRequestID,
		input.Reason,
		pq.Array([]string{"support-session"}),
		string(permissionsJSON),
	).Scan(&sessionID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return SupportSessionToken{}, ErrSupportSessionConflict
		}
		return SupportSessionToken{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO identity_support_session_audit
			(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
		VALUES ($1, $2, $3, $4, 'issued', $5)`,
		input.SupportRequestID,
		sessionID,
		input.TargetActorID,
		input.InitiatorActorID,
		input.Reason,
	); err != nil {
		return SupportSessionToken{}, err
	}
	if err := tx.Commit(); err != nil {
		return SupportSessionToken{}, err
	}
	identity := buildSupportIdentity(target, sessionID, input.InitiatorActorID, input.SupportRequestID, expiresAt)
	return SupportSessionToken{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   int(input.Duration.Seconds()),
		Identity:    identity,
	}, nil
}

func (r *Repository) RevokeSupportSession(
	ctx context.Context,
	requestID string,
	reason string,
) error {
	requestID = strings.TrimSpace(requestID)
	reason = strings.TrimSpace(reason)
	if r == nil || r.db == nil || requestID == "" || len(reason) < 5 {
		return ErrSupportSessionInvalid
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var sessionID, targetActorID, initiatorActorID string
	err = tx.QueryRowContext(ctx, `
		UPDATE identity_sessions
		SET status = 'revoked'
		WHERE support_request_id = $1
		  AND session_kind = 'support'
		  AND status = 'active'
		RETURNING id::TEXT, actor_id, initiator_actor_id`, requestID).Scan(
		&sessionID, &targetActorID, &initiatorActorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrSupportSessionConflict
	}
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO identity_support_session_audit
			(support_request_id, session_id, target_actor_id, initiator_actor_id, event_type, reason)
		VALUES ($1, $2, $3, $4, 'revoked', $5)`,
		requestID, sessionID, targetActorID, initiatorActorID, reason); err != nil {
		return err
	}
	return tx.Commit()
}

// ResolveAccessTokenDetailed preserves the standard session path while
// applying support-session role and permission overrides when relevant.
func (r *Repository) ResolveAccessTokenDetailed(ctx context.Context, token string) (ActorIdentity, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return ActorIdentity{}, ErrSessionInvalid
	}
	var target Actor
	var sessionID, initiatorActorID, requestID string
	var roles []string
	var permissionsJSON []byte
	var expiresAt time.Time
	err := r.db.QueryRowContext(ctx, `
		SELECT a.id, a.username, a.password_hash, a.tenant_id, a.phone_e164,
		       s.effective_roles, s.effective_permissions, a.active,
		       s.id::TEXT, s.initiator_actor_id, s.support_request_id, s.access_expires_at
		FROM identity_sessions s
		JOIN identity_actors a ON a.id = s.actor_id
		WHERE s.access_token_hash = $1
		  AND s.session_kind = 'support'
		  AND s.status = 'active'
		  AND s.access_expires_at > NOW()`, hashToken(token)).Scan(
		&target.ID,
		&target.Username,
		&target.PasswordHash,
		&target.TenantID,
		&target.PhoneE164,
		pq.Array(&roles),
		&permissionsJSON,
		&target.Active,
		&sessionID,
		&initiatorActorID,
		&requestID,
		&expiresAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		identity, standardErr := r.ResolveAccessToken(ctx, token)
		if standardErr == nil && identity.SessionKind == "" {
			identity.SessionKind = "standard"
		}
		return identity, standardErr
	}
	if err != nil {
		return ActorIdentity{}, err
	}
	if !target.Active {
		return ActorIdentity{}, ErrSessionInvalid
	}
	var permissions []Permission
	if err := json.Unmarshal(permissionsJSON, &permissions); err != nil {
		return ActorIdentity{}, fmt.Errorf("decode support permissions: %w", err)
	}
	identity := buildSupportIdentity(target, sessionID, initiatorActorID, requestID, expiresAt)
	identity.Roles = roles
	identity.Permissions = permissions
	return identity, nil
}
