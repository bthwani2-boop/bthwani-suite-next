package identity

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUnauthenticated        = errors.New("unauthenticated")
	ErrInvalidRefresh         = errors.New("invalid refresh token")
	ErrForbidden              = errors.New("forbidden")
	ErrInvalidActivation      = errors.New("invalid activation")
	ErrActivationRateLimited  = errors.New("activation rate limited")
	ErrActivationUnavailable  = errors.New("activation unavailable")
	ErrActivationTargetAbsent = errors.New("activation target absent")
	ErrLoginRateLimited       = errors.New("login rate limited")
)

// Login lockout policy: after loginLockoutThreshold failed attempts for the
// same username within loginLockoutWindow, further attempts are rejected
// without touching bcrypt or the actor row, until the window rolls past the
// oldest counted failure.
const (
	loginLockoutThreshold = 5
	loginLockoutWindow    = 15 * time.Minute
)

type Repository struct {
	db               *sql.DB
	now              func() time.Time
	activationSecret []byte
}

func NewRepository(db *sql.DB) *Repository {
	secret := strings.TrimSpace(os.Getenv("IDENTITY_ACTIVATION_HMAC_SECRET"))
	return &Repository{db: db, now: time.Now, activationSecret: []byte(secret)}
}

func (r *Repository) BootstrapLocalActors(ctx context.Context, input LocalBootstrap) error {
	if !input.Enabled {
		return nil
	}
	if len(input.Password) < 6 {
		return errors.New("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD must contain at least 6 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	actors := []struct {
		id, username, role, surface, scope, phone string
	}{
		{"operator-local-001", "operator", "operator", "control-panel", "all", "+967770000000"},
		{"partner-local-001", "bthwani", "partner", "app-partner", "own", "+967771000001"},
		{"field-local-001", "field", "field", "app-field", "assigned", "+967774182730"},
		{"captain-local-001", "captain", "captain", "app-captain", "assigned", "+967773000003"},
		{"client-local-001", "client", "client", "app-client", "own", "+967774000004"},
	}
	for _, actor := range actors {
		permissions, marshalErr := json.Marshal([]Permission{
			{Service: "dsh", Surface: actor.surface, Action: "store:read", Scope: actor.scope},
			{Service: "dsh", Surface: actor.surface, Action: "store:write", Scope: actor.scope},
		})
		if marshalErr != nil {
			return marshalErr
		}
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO identity_actors
				(id, username, password_hash, tenant_id, phone_e164, roles, permissions, active, updated_at)
			VALUES ($1, $2, $3, 'local-dsh', $4, $5, $6::jsonb, true, now())
			ON CONFLICT (id) DO UPDATE SET
				username = EXCLUDED.username,
				password_hash = EXCLUDED.password_hash,
				phone_e164 = EXCLUDED.phone_e164,
				roles = EXCLUDED.roles,
				permissions = EXCLUDED.permissions,
				active = true,
				updated_at = now()`,
			actor.id, actor.username, string(hash), actor.phone, pq.Array([]string{actor.role}), string(permissions))
		if err != nil {
			return err
		}
	}
	return nil
}

func NormalizePhoneE164(raw string) (string, error) {
	phone := strings.TrimSpace(raw)
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")
	if strings.HasPrefix(phone, "00") {
		phone = "+" + strings.TrimPrefix(phone, "00")
	} else if strings.HasPrefix(phone, "967") {
		phone = "+" + phone
	} else if strings.HasPrefix(phone, "7") {
		phone = "+967" + phone
	}
	ok, _ := regexp.MatchString(`^\+[1-9][0-9]{7,14}$`, phone)
	if !ok {
		return "", ErrInvalidActivation
	}
	return phone, nil
}

func (r *Repository) IssueActivation(ctx context.Context, issuer ActorIdentity, input IssueActivationInput, idempotencyKey, correlationID string) (IssueActivationResult, error) {
	if len(r.activationSecret) < 32 {
		return IssueActivationResult{}, ErrActivationUnavailable
	}
	if !hasRole(issuer.Roles, "operator") {
		return IssueActivationResult{}, ErrForbidden
	}
	actorType := strings.TrimSpace(input.ActorType)
	surface := strings.TrimSpace(input.Surface)
	if actorType != "field" || surface != "app-field" {
		return IssueActivationResult{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.Phone)
	if err != nil {
		return IssueActivationResult{}, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return IssueActivationResult{}, err
	}
	defer tx.Rollback()

	var lastIssued time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT created_at
		FROM identity_activation_challenges
		WHERE actor_type = $1 AND phone_e164 = $2 AND status = 'pending'
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, actorType, phone).Scan(&lastIssued)
	if err == nil && r.now().Sub(lastIssued) < time.Minute {
		return IssueActivationResult{}, ErrActivationRateLimited
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return IssueActivationResult{}, err
	}

	actor, err := actorByPhoneAndRoleTx(ctx, tx, phone, actorType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return IssueActivationResult{}, ErrActivationTargetAbsent
		}
		return IssueActivationResult{}, err
	}
	if _, err = tx.ExecContext(ctx, `
		UPDATE identity_activation_challenges
		SET status = 'revoked', updated_at = now()
		WHERE actor_type = $1 AND phone_e164 = $2 AND status = 'pending'`,
		actorType, phone); err != nil {
		return IssueActivationResult{}, err
	}

	code, err := randomActivationCode()
	if err != nil {
		return IssueActivationResult{}, err
	}
	activationID, err := randomToken(18)
	if err != nil {
		return IssueActivationResult{}, err
	}
	expiresAt := r.now().Add(10 * time.Minute)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_activation_challenges
			(id, actor_id, actor_type, phone_e164, surface, code_hash, expires_at,
			 issued_by_actor_id, idempotency_key, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''))`,
		activationID, actor.ID, actorType, phone, surface,
		r.activationCodeHash(actorType, phone, code), expiresAt,
		issuer.Subject, strings.TrimSpace(idempotencyKey), strings.TrimSpace(correlationID))
	if err != nil {
		return IssueActivationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssueActivationResult{}, err
	}
	return IssueActivationResult{
		ActivationID: activationID,
		Code:         code,
		MaskedPhone:  maskPhone(phone),
		ExpiresAt:    expiresAt,
	}, nil
}

func (r *Repository) ConsumeActivation(ctx context.Context, input ConsumeActivationInput) (TokenPair, error) {
	if len(r.activationSecret) < 32 {
		return TokenPair{}, ErrActivationUnavailable
	}
	actorType := strings.TrimSpace(input.ActorType)
	if actorType != "field" {
		return TokenPair{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.Phone)
	if err != nil {
		return TokenPair{}, err
	}
	code := strings.TrimSpace(input.Code)
	ok, _ := regexp.MatchString(`^[0-9]{6}$`, code)
	if !ok {
		return TokenPair{}, ErrInvalidActivation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return TokenPair{}, err
	}
	defer tx.Rollback()

	var challengeID, actorID, codeHash, status string
	var attempts int
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id, actor_id, code_hash, status, attempts, expires_at
		FROM identity_activation_challenges
		WHERE actor_type = $1 AND phone_e164 = $2 AND surface = 'app-field'
		  AND status = 'pending'
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, actorType, phone).Scan(&challengeID, &actorID, &codeHash, &status, &attempts, &expiresAt)
	if err != nil {
		return TokenPair{}, ErrInvalidActivation
	}
	if status != "pending" || !expiresAt.After(r.now()) {
		_, _ = tx.ExecContext(ctx, `UPDATE identity_activation_challenges SET status = 'expired', updated_at = now() WHERE id = $1 AND status = 'pending'`, challengeID)
		return TokenPair{}, ErrInvalidActivation
	}
	if attempts >= 5 {
		_, _ = tx.ExecContext(ctx, `UPDATE identity_activation_challenges SET status = 'locked', updated_at = now() WHERE id = $1`, challengeID)
		return TokenPair{}, ErrInvalidActivation
	}
	if !hmac.Equal([]byte(codeHash), []byte(r.activationCodeHash(actorType, phone, code))) {
		nextAttempts := attempts + 1
		nextStatus := "pending"
		if nextAttempts >= 5 {
			nextStatus = "locked"
		}
		_, _ = tx.ExecContext(ctx, `
			UPDATE identity_activation_challenges
			SET attempts = $2, status = $3, updated_at = now()
			WHERE id = $1`, challengeID, nextAttempts, nextStatus)
		return TokenPair{}, ErrInvalidActivation
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE identity_activation_challenges
		SET status = 'consumed', consumed_at = now(), updated_at = now()
		WHERE id = $1`, challengeID); err != nil {
		return TokenPair{}, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE identity_actors SET active = true, updated_at = now() WHERE id = $1`, actorID); err != nil {
		return TokenPair{}, err
	}
	actor, err := actorByIDTx(ctx, tx, actorID)
	if err != nil {
		return TokenPair{}, err
	}
	pair, err := createSessionTx(ctx, tx, actor, input.DeviceFingerprint, r.now())
	if err != nil {
		return TokenPair{}, err
	}
	if err := tx.Commit(); err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

// Login authenticates a username/password pair. Every attempt is recorded
// in identity_login_attempts (never the password itself) for both audit
// trail and lockout purposes; a username with loginLockoutThreshold recent
// failures is rejected before any bcrypt work or actor lookup happens.
func (r *Repository) Login(ctx context.Context, username, password, fingerprint, ipAddress string) (TokenPair, error) {
	normalizedUsername := strings.TrimSpace(username)

	locked, err := r.isLoginLocked(ctx, normalizedUsername)
	if err != nil {
		return TokenPair{}, err
	}
	if locked {
		return TokenPair{}, ErrLoginRateLimited
	}

	actor, err := r.actorByUsername(ctx, normalizedUsername)
	if err != nil || !actor.Active {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, ErrUnauthenticated
	}
	if bcrypt.CompareHashAndPassword([]byte(actor.PasswordHash), []byte(password)) != nil {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, ErrUnauthenticated
	}

	pair, err := r.createSession(ctx, actor, fingerprint)
	if err != nil {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, err
	}
	r.recordLoginAttempt(ctx, normalizedUsername, true, ipAddress)
	return pair, nil
}

func (r *Repository) isLoginLocked(ctx context.Context, username string) (bool, error) {
	var failureCount int
	err := r.db.QueryRowContext(ctx, `
		SELECT count(*) FROM identity_login_attempts
		WHERE username = $1 AND succeeded = false AND created_at > $2`,
		username, r.now().Add(-loginLockoutWindow)).Scan(&failureCount)
	if err != nil {
		return false, err
	}
	return failureCount >= loginLockoutThreshold, nil
}

// recordLoginAttempt is best-effort: a logging failure must never block or
// fail the login flow itself, so errors are swallowed here.
func (r *Repository) recordLoginAttempt(ctx context.Context, username string, succeeded bool, ipAddress string) {
	_, _ = r.db.ExecContext(ctx, `
		INSERT INTO identity_login_attempts (username, succeeded, ip_address, created_at)
		VALUES ($1, $2, NULLIF($3, ''), $4)`,
		username, succeeded, ipAddress, r.now())
}

func (r *Repository) ResolveAccessToken(ctx context.Context, token string) (ActorIdentity, error) {
	hash := tokenHash(token)
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	var sessionID string
	var expiresAt time.Time
	err := r.db.QueryRowContext(ctx, `
		SELECT a.id, a.username, a.password_hash, a.tenant_id, a.roles, a.permissions, a.active,
		       s.id, s.access_expires_at
		FROM identity_sessions s
		JOIN identity_actors a ON a.id = s.actor_id
		WHERE s.access_token_hash = $1
		  AND s.revoked_at IS NULL
		  AND s.access_expires_at > now()
		  AND a.active = true`, hash).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.TenantID,
		&roles, &permissionsJSON, &actor.Active, &sessionID, &expiresAt,
	)
	if err != nil {
		return ActorIdentity{}, ErrUnauthenticated
	}
	actor.Roles = []string(roles)
	if err := json.Unmarshal(permissionsJSON, &actor.Permissions); err != nil {
		return ActorIdentity{}, err
	}
	return toIdentity(actor, sessionID, expiresAt), nil
}

func (r *Repository) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return TokenPair{}, err
	}
	defer tx.Rollback()

	var actorID, sessionID string
	err = tx.QueryRowContext(ctx, `
		SELECT actor_id, id
		FROM identity_sessions
		WHERE refresh_token_hash = $1
		  AND revoked_at IS NULL
		  AND refresh_expires_at > now()
		FOR UPDATE`, tokenHash(refreshToken)).Scan(&actorID, &sessionID)
	if err != nil {
		return TokenPair{}, ErrInvalidRefresh
	}
	if _, err = tx.ExecContext(ctx, `UPDATE identity_sessions SET revoked_at = now() WHERE id = $1`, sessionID); err != nil {
		return TokenPair{}, err
	}
	actor, err := actorByIDTx(ctx, tx, actorID)
	if err != nil || !actor.Active {
		return TokenPair{}, ErrInvalidRefresh
	}
	pair, err := createSessionTx(ctx, tx, actor, "refresh-rotation", r.now())
	if err != nil {
		return TokenPair{}, err
	}
	if err := tx.Commit(); err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func (r *Repository) Logout(ctx context.Context, accessToken string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = COALESCE(revoked_at, now())
		WHERE access_token_hash = $1`, tokenHash(accessToken))
	return err
}

func (r *Repository) createSession(ctx context.Context, actor Actor, fingerprint string) (TokenPair, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return TokenPair{}, err
	}
	defer tx.Rollback()
	pair, err := createSessionTx(ctx, tx, actor, fingerprint, r.now())
	if err != nil {
		return TokenPair{}, err
	}
	if err := tx.Commit(); err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func createSessionTx(ctx context.Context, tx *sql.Tx, actor Actor, fingerprint string, now time.Time) (TokenPair, error) {
	sessionID, err := randomToken(18)
	if err != nil {
		return TokenPair{}, err
	}
	accessToken, err := randomToken(32)
	if err != nil {
		return TokenPair{}, err
	}
	refreshToken, err := randomToken(48)
	if err != nil {
		return TokenPair{}, err
	}
	accessExpiry := now.Add(15 * time.Minute)
	refreshExpiry := now.Add(7 * 24 * time.Hour)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_sessions
			(id, actor_id, access_token_hash, refresh_token_hash, device_fingerprint,
			 access_expires_at, refresh_expires_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)`,
		sessionID, actor.ID, tokenHash(accessToken), tokenHash(refreshToken),
		strings.TrimSpace(fingerprint), accessExpiry, refreshExpiry)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken: accessToken, RefreshToken: refreshToken, AccessExpiry: accessExpiry,
		Identity: toIdentity(actor, sessionID, accessExpiry),
	}, nil
}

func (r *Repository) actorByUsername(ctx context.Context, username string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, tenant_id, COALESCE(phone_e164, ''), roles, permissions, active
		FROM identity_actors WHERE username = $1`, username).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.TenantID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Active,
	)
	if err != nil {
		return Actor{}, err
	}
	actor.Roles = []string(roles)
	if err := json.Unmarshal(permissionsJSON, &actor.Permissions); err != nil {
		return Actor{}, err
	}
	return actor, nil
}

func actorByIDTx(ctx context.Context, tx *sql.Tx, actorID string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, password_hash, tenant_id, COALESCE(phone_e164, ''), roles, permissions, active
		FROM identity_actors WHERE id = $1`, actorID).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.TenantID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Active,
	)
	if err != nil {
		return Actor{}, err
	}
	actor.Roles = []string(roles)
	if err := json.Unmarshal(permissionsJSON, &actor.Permissions); err != nil {
		return Actor{}, err
	}
	return actor, nil
}

func toIdentity(actor Actor, sessionID string, expiresAt time.Time) ActorIdentity {
	surfaces := map[string]bool{}
	services := map[string]bool{}
	for _, permission := range actor.Permissions {
		surfaces[permission.Surface] = true
		services[permission.Service] = true
	}
	return ActorIdentity{
		Subject: actor.ID, TenantID: actor.TenantID, Roles: actor.Roles,
		Permissions: actor.Permissions, AuthState: "authenticated",
		SurfaceAccess: surfaces, ServiceAccess: services,
		SessionID: sessionID, ExpiresAt: expiresAt,
	}
}

func randomToken(byteCount int) (string, error) {
	value := make([]byte, byteCount)
	if _, err := rand.Read(value); err != nil {
		return "", fmt.Errorf("random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func randomActivationCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("random activation code: %w", err)
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (r *Repository) activationCodeHash(actorType, phone, code string) string {
	mac := hmac.New(sha256.New, r.activationSecret)
	_, _ = mac.Write([]byte(actorType))
	_, _ = mac.Write([]byte("|"))
	_, _ = mac.Write([]byte(phone))
	_, _ = mac.Write([]byte("|"))
	_, _ = mac.Write([]byte(code))
	return hex.EncodeToString(mac.Sum(nil))
}

func actorByPhoneAndRoleTx(ctx context.Context, tx *sql.Tx, phone, role string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, password_hash, tenant_id, COALESCE(phone_e164, ''), roles, permissions, active
		FROM identity_actors
		WHERE phone_e164 = $1 AND roles @> $2
		LIMIT 1
		FOR UPDATE`, phone, pq.Array([]string{role})).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.TenantID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Active,
	)
	if err != nil {
		return Actor{}, err
	}
	actor.Roles = []string(roles)
	if err := json.Unmarshal(permissionsJSON, &actor.Permissions); err != nil {
		return Actor{}, err
	}
	return actor, nil
}

func hasRole(roles []string, expected string) bool {
	for _, role := range roles {
		if role == expected {
			return true
		}
	}
	return false
}

func maskPhone(phone string) string {
	if len(phone) <= 6 {
		return phone
	}
	return phone[:4] + strings.Repeat("*", len(phone)-6) + phone[len(phone)-2:]
}
