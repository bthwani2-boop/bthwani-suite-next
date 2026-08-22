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
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUnauthenticated         = errors.New("unauthenticated")
	ErrInvalidRefresh          = errors.New("invalid refresh token")
	ErrForbidden               = errors.New("forbidden")
	ErrInvalidActivation       = errors.New("invalid activation")
	ErrActivationRateLimited   = errors.New("activation rate limited")
	ErrActivationUnavailable   = errors.New("activation unavailable")
	ErrActivationTargetAbsent  = errors.New("activation target absent")
	ErrLoginRateLimited        = errors.New("login rate limited")
	ErrPhoneAlreadyBound       = errors.New("phone already bound to another actor")
	ErrUsernameTaken           = errors.New("username already taken")
	ErrActorNotFound           = errors.New("actor not found")
	ErrActorDeactivated        = errors.New("actor is deactivated")
	ErrActorAlreadyDeactivated = errors.New("actor is already deactivated")
	ErrActorAlreadyActive      = errors.New("actor is already active")
	ErrInvalidActorTransition  = errors.New("invalid actor lifecycle transition")
)

// activationSurfaceByActorType is the single source for the authentication
// surface of every activatable actor type. Issuance policy is deliberately
// separate: client and partner may request public OTPs, while field and captain
// must first be provisioned by Workforce and receive an actor-bound challenge.
var activationSurfaceByActorType = map[string]string{
	"client":  "app-client",
	"partner": "app-partner",
	"field":   "app-field",
	"captain": "app-captain",
}

var publicOtpActorTypes = map[string]bool{
	"client":  true,
	"partner": true,
}

var workforceManagedActorTypes = map[string]bool{
	"field":   true,
	"captain": true,
}

func activationSurfaceFor(actorType string) (string, bool) {
	surface, ok := activationSurfaceByActorType[actorType]
	return surface, ok
}

func workforceActivationSurfaceFor(actorType string) (string, bool) {
	if !workforceManagedActorTypes[actorType] {
		return "", false
	}
	return activationSurfaceFor(actorType)
}

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
	Enforcer         *PermissionEnforcer
	now              func() time.Time
	activationSecret []byte
}

func NewRepository(db *sql.DB) *Repository {
	secret := strings.TrimSpace(os.Getenv("IDENTITY_ACTIVATION_HMAC_SECRET"))
	return &Repository{
		db:               db,
		Enforcer:         NewPermissionEnforcer(db),
		now:              time.Now,
		activationSecret: []byte(secret),
	}
}

func (r *Repository) BootstrapLocalActors(ctx context.Context, input LocalBootstrap) error {
	if !input.Enabled {
		return nil
	}
	if len(input.Password) < 6 {
		return errors.New("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD must contain at least 6 characters")
	}
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" {
		return errors.New("BTHWANI_OPERATOR_CONTEXT_ID is required when IDENTITY_LOCAL_BOOTSTRAP=true")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	actors := []struct {
		id, username, role, surface, scope, phone string
	}{
		{"operator-local-001", "operator", "operator", "control-panel", "all", "+967770000000"},
		{"partner-local-001", "bthwani", "partner", "app-partner", "own", "+967771111111"},
		{"client-local-001", "client", "client", "app-client", "own", "+967772222222"},
	}
	// Field agents and captains are deliberately absent. Workforce owns provider
	// actor creation and always provisions with a server-generated workforce code
	// as the username, so an actor pre-seeded here under a friendly username would
	// permanently conflict on the phone and could never be adopted. They are
	// created at runtime by tools/dev/local-workforce-provisioning.mjs.
	for _, actor := range actors {
		actorPermissions := []Permission{
			{Service: "dsh", Surface: actor.surface, Action: "store:read", Scope: actor.scope},
			{Service: "dsh", Surface: actor.surface, Action: "store:write", Scope: actor.scope},
		}
		if actor.role == "operator" {
			actorPermissions = localOperatorDevelopmentPermissions()
		}
		// 1. Ensure the role exists in identity_roles
		var roleID string
		err = r.db.QueryRowContext(ctx, `
			INSERT INTO identity_roles (name, description) VALUES ($1, $2)
			ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
			RETURNING id`, actor.role, "Local Bootstrap Role").Scan(&roleID)
		if err != nil {
			return err
		}

		// 2. Upsert the actor
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO identity_actors
				(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version, updated_at)
			VALUES ($1, $2, $3, $4, $5, ARRAY[]::text[], '[]'::jsonb, 'ACTIVE', 1, now())
			ON CONFLICT (id) DO UPDATE SET
				username = EXCLUDED.username,
				password_hash = EXCLUDED.password_hash,
				operator_context_id = EXCLUDED.operator_context_id,
				phone_e164 = EXCLUDED.phone_e164,
				status = 'ACTIVE',
				version = identity_actors.version + 1,
				updated_at = now()`,
			actor.id, actor.username, string(hash), operatorContextID, actor.phone)
		if err != nil {
			return err
		}

		// 3. Link actor to role
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO identity_actor_roles (actor_id, role_id, granted_by)
			VALUES ($1, $2, 'system_bootstrap')
			ON CONFLICT DO NOTHING`, actor.id, roleID)
		if err != nil {
			return err
		}

		// 4. Map permissions to the role
		for _, p := range actorPermissions {
			var permID string
			err = r.db.QueryRowContext(ctx, `
				INSERT INTO identity_permission_vocabulary (service, surface, action, description)
				VALUES ($1, $2, $3, 'Local Bootstrap Permission')
				ON CONFLICT (service, surface, action) DO UPDATE SET description = EXCLUDED.description
				RETURNING id`, p.Service, p.Surface, p.Action).Scan(&permID)
			if err != nil {
				return err
			}

			_, err = r.db.ExecContext(ctx, `
				INSERT INTO identity_role_permissions (role_id, permission_id, scope)
				VALUES ($1, $2, $3)
				ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope`, roleID, permID, p.Scope)
			if err != nil {
				return err
			}
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

// IssueActivationForActor issues an activation challenge for a specific actor
// id. This is the internal service-to-service path used by Workforce. The
// caller references the provider actor id and Identity resolves the sovereign
// phone. Only Workforce-managed actor types are accepted here.
func (r *Repository) IssueActivationForActor(ctx context.Context, actorID string, input IssueActivationForActorInput, idempotencyKey, correlationID string) (IssueActivationResult, error) {
	if len(r.activationSecret) < 32 {
		return IssueActivationResult{}, ErrActivationUnavailable
	}
	expectedActorType := strings.TrimSpace(input.ExpectedActorType)
	expectedSurface := strings.TrimSpace(input.ExpectedSurface)
	canonicalSurface, ok := workforceActivationSurfaceFor(expectedActorType)
	if !ok || expectedSurface != canonicalSurface || strings.TrimSpace(input.IssuedByActorID) == "" {
		return IssueActivationResult{}, ErrInvalidActivation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return IssueActivationResult{}, err
	}
	defer tx.Rollback()

	actor, err := actorByIDForUpdateTx(ctx, tx, actorID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return IssueActivationResult{}, ErrActorNotFound
		}
		return IssueActivationResult{}, err
	}
	if err := validateExpectedActivationTarget(actor, expectedActorType, expectedSurface); err != nil {
		return IssueActivationResult{}, err
	}
	result, err := r.issueChallengeTx(ctx, tx, actor, expectedActorType, expectedSurface,
		input.IssuedByActorID, scopedActivationIdempotencyKey(idempotencyKey, expectedActorType, expectedSurface), correlationID)
	if err != nil {
		return IssueActivationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssueActivationResult{}, err
	}
	return result, nil
}

func validateExpectedActivationTarget(actor Actor, expectedActorType, expectedSurface string) error {
	canonicalSurface, ok := workforceActivationSurfaceFor(strings.TrimSpace(expectedActorType))
	if !ok || strings.TrimSpace(expectedSurface) != canonicalSurface {
		return ErrInvalidActivation
	}
	if !hasRole(actor.Roles, strings.TrimSpace(expectedActorType)) || strings.TrimSpace(actor.PhoneE164) == "" {
		return ErrInvalidActivation
	}
	return nil
}

func scopedActivationIdempotencyKey(idempotencyKey, actorType, surface string) string {
	key := strings.TrimSpace(idempotencyKey)
	if key == "" {
		return ""
	}
	return strings.Join([]string{actorType, surface, key}, ":")
}

// issueChallengeTx enforces the per-phone issue rate limit, revokes any prior
// pending challenge for the same actor type and phone, and inserts the new one.
func (r *Repository) issueChallengeTx(ctx context.Context, tx *sql.Tx, actor Actor, actorType, surface, issuedByActorID, idempotencyKey, correlationID string) (IssueActivationResult, error) {
	phone := actor.PhoneE164

	var lastIssued time.Time
	err := tx.QueryRowContext(ctx, `
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
	if _, err := tx.ExecContext(ctx, "SAVEPOINT idempotency_guard"); err != nil {
		return IssueActivationResult{}, err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_activation_challenges
			(id, actor_id, actor_type, phone_e164, surface, code_hash, expires_at,
			 issued_by_actor_id, idempotency_key, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''))`,
		activationID, actor.ID, actorType, phone, surface,
		r.activationCodeHash(actorType, phone, code), expiresAt,
		issuedByActorID, strings.TrimSpace(idempotencyKey), strings.TrimSpace(correlationID))
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" && pqErr.Constraint == "identity_activation_idempotency_idx" {
			if _, rbErr := tx.ExecContext(ctx, "ROLLBACK TO SAVEPOINT idempotency_guard"); rbErr != nil {
				return IssueActivationResult{}, err
			}
			var existingID, existingPhone string
			var existingExpiresAt time.Time
			if selErr := tx.QueryRowContext(ctx, `
				SELECT id, phone_e164, expires_at
				FROM identity_activation_challenges
				WHERE idempotency_key = $1
			`, strings.TrimSpace(idempotencyKey)).Scan(&existingID, &existingPhone, &existingExpiresAt); selErr == nil {
				return IssueActivationResult{
					ActivationID: existingID,
					Code:         "", // Do not expose code on idempotent retry
					MaskedPhone:  maskPhone(existingPhone),
					ExpiresAt:    existingExpiresAt,
				}, nil
			}
		}
		return IssueActivationResult{}, err
	}
	if _, err := tx.ExecContext(ctx, "RELEASE SAVEPOINT idempotency_guard"); err != nil {
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
	surface, ok := activationSurfaceFor(actorType)
	if !ok {
		return TokenPair{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.Phone)
	if err != nil {
		return TokenPair{}, err
	}
	code := strings.TrimSpace(input.Code)
	codeOK, _ := regexp.MatchString(`^[0-9]{6}$`, code)
	if !codeOK {
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
		WHERE actor_type = $1 AND phone_e164 = $2 AND surface = $3
		  AND status = 'pending'
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, actorType, phone, surface).Scan(&challengeID, &actorID, &codeHash, &status, &attempts, &expiresAt)
	if err != nil {
		return TokenPair{}, ErrInvalidActivation
	}
	if status != "pending" || !expiresAt.After(r.now()) {
		if _, err = tx.ExecContext(ctx, `UPDATE identity_activation_challenges SET status = 'expired', updated_at = now() WHERE id = $1 AND status = 'pending'`, challengeID); err != nil {
			return TokenPair{}, err
		}
		if err = tx.Commit(); err != nil {
			return TokenPair{}, err
		}
		return TokenPair{}, ErrInvalidActivation
	}
	if attempts >= 5 {
		if _, err = tx.ExecContext(ctx, `UPDATE identity_activation_challenges SET status = 'locked', updated_at = now() WHERE id = $1`, challengeID); err != nil {
			return TokenPair{}, err
		}
		if err = tx.Commit(); err != nil {
			return TokenPair{}, err
		}
		return TokenPair{}, ErrInvalidActivation
	}
	if !hmac.Equal([]byte(codeHash), []byte(r.activationCodeHash(actorType, phone, code))) {
		nextAttempts := attempts + 1
		nextStatus := "pending"
		if nextAttempts >= 5 {
			nextStatus = "locked"
		}
		if _, err = tx.ExecContext(ctx, `
			UPDATE identity_activation_challenges
			SET attempts = $2, status = $3, updated_at = now()
			WHERE id = $1`, challengeID, nextAttempts, nextStatus); err != nil {
			return TokenPair{}, err
		}
		if err = tx.Commit(); err != nil {
			return TokenPair{}, err
		}
		return TokenPair{}, ErrInvalidActivation
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE identity_activation_challenges
		SET status = 'consumed', consumed_at = now(), updated_at = now()
		WHERE id = $1`, challengeID); err != nil {
		return TokenPair{}, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE identity_actors SET status = 'ACTIVE', version = version + 1, updated_at = now() WHERE id = $1`, actorID); err != nil {
		return TokenPair{}, err
	}
	actor, err := actorByIDTx(ctx, tx, actorID)
	if err != nil {
		return TokenPair{}, err
	}
	pair, err := createSessionTx(ctx, tx, actor, input.DeviceFingerprint, surface, r.now())
	if err != nil {
		return TokenPair{}, err
	}
	if err := tx.Commit(); err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func actorCanAccessSurface(actor Actor, surface string) bool {
	for _, permission := range actor.Permissions {
		if permission.Surface == surface {
			return true
		}
	}
	return false
}

func resolvePasswordLoginSurface(actor Actor) (string, error) {
	roleSurface := map[string]string{
		"client":  "app-client",
		"partner": "app-partner",
		"field":   "app-field",
		"captain": "app-captain",
	}
	candidates := map[string]struct{}{}

	for _, role := range actor.Roles {
		if surface, ok := roleSurface[role]; ok {
			if actorCanAccessSurface(actor, surface) {
				candidates[surface] = struct{}{}
			}
			continue
		}
		if actorCanAccessSurface(actor, "control-panel") {
			candidates["control-panel"] = struct{}{}
		}
	}

	if len(candidates) == 1 {
		for surface := range candidates {
			return surface, nil
		}
	}
	if len(candidates) > 1 {
		return "", ErrForbidden
	}

	permissionSurfaces := map[string]struct{}{}
	for _, permission := range actor.Permissions {
		if strings.TrimSpace(permission.Surface) != "" {
			permissionSurfaces[permission.Surface] = struct{}{}
		}
	}
	if len(permissionSurfaces) == 1 {
		for surface := range permissionSurfaces {
			return surface, nil
		}
	}
	return "", ErrForbidden
}

// Login authenticates a username/password pair. Every attempt is recorded
// in identity_login_attempts for audit and lockout purposes.
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
	if err != nil {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, ErrUnauthenticated
	}
	if bcrypt.CompareHashAndPassword([]byte(actor.PasswordHash), []byte(password)) != nil {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, ErrUnauthenticated
	}
	if actor.Status != ActorStatusActive {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, ErrActorDeactivated
	}

	surface, err := resolvePasswordLoginSurface(actor)
	if err != nil {
		r.recordLoginAttempt(ctx, normalizedUsername, false, ipAddress)
		return TokenPair{}, err
	}

	pair, err := r.createSession(ctx, actor, fingerprint, surface)
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
	var sessionSurface string
	var expiresAt time.Time
	err := r.db.QueryRowContext(ctx, `
		SELECT a.id, a.username, a.password_hash, a.operator_context_id, COALESCE(a.phone_e164, ''), a.roles, a.permissions, a.status, a.version,
		       s.id, s.surface, s.access_expires_at
		FROM identity_sessions s
		JOIN identity_actors a ON a.id = s.actor_id
		WHERE s.access_token_hash = $1
		  AND s.revoked_at IS NULL
		  AND s.access_expires_at > now()
		  AND a.status = 'ACTIVE'`, hash).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.OperatorContextID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Status, &actor.Version, &sessionID, &sessionSurface, &expiresAt,
	)
	if err != nil {
		return ActorIdentity{}, ErrUnauthenticated
	}
	actor.Roles = []string(roles)
	if err := json.Unmarshal(permissionsJSON, &actor.Permissions); err != nil {
		return ActorIdentity{}, err
	}
	return toIdentity(actor, sessionID, sessionSurface, expiresAt), nil
}

func (r *Repository) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	parts := strings.SplitN(refreshToken, ".", 2)
	if len(parts) != 2 {
		return TokenPair{}, ErrInvalidRefresh
	}
	sessionID := parts[0]
	presentedRandomToken := parts[1]

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return TokenPair{}, err
	}
	defer tx.Rollback()

	var actorID, surface, currentHash string
	err = tx.QueryRowContext(ctx, `
		SELECT actor_id, surface, refresh_token_hash
		FROM identity_sessions
		WHERE id = $1
		  AND revoked_at IS NULL
		  AND refresh_expires_at > now()
		FOR UPDATE`, sessionID).Scan(&actorID, &surface, &currentHash)
	if err != nil {
		return TokenPair{}, ErrInvalidRefresh
	}

	if currentHash != tokenHash(presentedRandomToken) {
		// REUSE DETECTED!
		_, _ = tx.ExecContext(ctx, `
			UPDATE identity_sessions
			SET revoked_at = now(), compromised_at = now()
			WHERE id = $1`, sessionID)
		tx.Commit()
		return TokenPair{}, ErrInvalidRefresh
	}

	actor, err := actorByIDTx(ctx, tx, actorID)
	if err != nil || actor.Status != ActorStatusActive {
		return TokenPair{}, ErrInvalidRefresh
	}

	accessToken, err := randomToken(32)
	if err != nil {
		return TokenPair{}, err
	}
	newRandomToken, err := randomToken(48)
	if err != nil {
		return TokenPair{}, err
	}
	newRefreshToken := sessionID + "." + newRandomToken

	now := r.now()
	accessExpiry := now.Add(15 * time.Minute)
	refreshExpiry := now.Add(7 * 24 * time.Hour)

	_, err = tx.ExecContext(ctx, `
		UPDATE identity_sessions
		SET access_token_hash = $1,
		    refresh_token_hash = $2,
		    version = version + 1,
		    last_used_at = $3,
		    access_expires_at = $4,
		    refresh_expires_at = $5
		WHERE id = $6`,
		tokenHash(accessToken), tokenHash(newRandomToken), now, accessExpiry, refreshExpiry, sessionID)
	if err != nil {
		return TokenPair{}, err
	}

	if err := tx.Commit(); err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken: accessToken, RefreshToken: newRefreshToken, AccessExpiry: accessExpiry,
		Identity: toIdentity(actor, sessionID, surface, accessExpiry),
	}, nil
}

func (r *Repository) Logout(ctx context.Context, accessToken string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = COALESCE(revoked_at, now())
		WHERE access_token_hash = $1`, tokenHash(accessToken))
	return err
}

func (r *Repository) createSession(ctx context.Context, actor Actor, fingerprint string, surface string) (TokenPair, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return TokenPair{}, err
	}
	defer tx.Rollback()
	pair, err := createSessionTx(ctx, tx, actor, fingerprint, surface, r.now())
	if err != nil {
		return TokenPair{}, err
	}
	if err := tx.Commit(); err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func createSessionTx(ctx context.Context, tx *sql.Tx, actor Actor, fingerprint string, surface string, now time.Time) (TokenPair, error) {
	sessionID, err := randomToken(18)
	if err != nil {
		return TokenPair{}, err
	}
	accessToken, err := randomToken(32)
	if err != nil {
		return TokenPair{}, err
	}
	randomRefreshToken, err := randomToken(48)
	if err != nil {
		return TokenPair{}, err
	}
	refreshToken := sessionID + "." + randomRefreshToken
	accessExpiry := now.Add(15 * time.Minute)
	refreshExpiry := now.Add(7 * 24 * time.Hour)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_sessions
			(id, actor_id, access_token_hash, refresh_token_hash, device_fingerprint,
			 surface, access_expires_at, refresh_expires_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8)`,
		sessionID, actor.ID, tokenHash(accessToken), tokenHash(randomRefreshToken),
		strings.TrimSpace(fingerprint), surface, accessExpiry, refreshExpiry)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken: accessToken, RefreshToken: refreshToken, AccessExpiry: accessExpiry,
		Identity: toIdentity(actor, sessionID, surface, accessExpiry),
	}, nil
}

func (r *Repository) actorByUsername(ctx context.Context, username string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, operator_context_id, COALESCE(phone_e164, ''), roles, permissions, status, version
		FROM identity_actors WHERE username = $1`, username).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.OperatorContextID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Status, &actor.Version,
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
		SELECT id, username, password_hash, operator_context_id, COALESCE(phone_e164, ''), roles, permissions, status, version
		FROM identity_actors WHERE id = $1`, actorID).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.OperatorContextID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Status, &actor.Version,
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

func toIdentity(actor Actor, sessionID string, sessionSurface string, expiresAt time.Time) ActorIdentity {
	surfaces := map[string]bool{}
	services := map[string]bool{}
	for _, permission := range actor.Permissions {
		surfaces[permission.Surface] = true
		services[permission.Service] = true
	}
	return ActorIdentity{
		Subject: actor.ID, OperatorContextID: actor.OperatorContextID, PhoneE164: actor.PhoneE164, Roles: actor.Roles,
		Permissions: actor.Permissions, AuthState: "authenticated",
		SurfaceAccess: surfaces, ServiceAccess: services, SessionSurface: sessionSurface,
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
	// 000000 is permanently retired and is never generated as a legitimate
	// challenge. Generate the inclusive range 000001..999999 instead.
	value, err := rand.Int(rand.Reader, big.NewInt(999999))
	if err != nil {
		return "", fmt.Errorf("random activation code: %w", err)
	}
	return fmt.Sprintf("%06d", value.Int64()+1), nil
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

// ProvisionActor creates an inactive actor for a Workforce-managed provider.
// It is intentionally limited to field and captain roles and requires the
// trusted scope supplied by the authenticated Workforce service boundary.
func (r *Repository) ProvisionActor(ctx context.Context, input ProvisionActorInput) (ActorAdminView, error) {
	role := strings.TrimSpace(input.Role)
	surface, ok := workforceActivationSurfaceFor(role)
	if !ok {
		return ActorAdminView{}, ErrInvalidActivation
	}
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.PhoneE164)
	if err != nil {
		return ActorAdminView{}, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer tx.Rollback()

	existing, err := actorByPhoneAnyRoleTx(ctx, tx, phone)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return ActorAdminView{}, err
	}
	if err == nil && strings.TrimSpace(existing.OperatorContextID) != operatorContextID {
		return ActorAdminView{}, ErrForbidden
	}
	if err == nil {
		if hasRole(existing.Roles, role) {
			if err := tx.Commit(); err != nil {
				return ActorAdminView{}, err
			}
			return toAdminView(existing), nil
		}
		permissionsJSON, err := providerPermissions(surface)
		if err != nil {
			return ActorAdminView{}, err
		}
		var requestedPermissions []Permission
		if err := json.Unmarshal(permissionsJSON, &requestedPermissions); err != nil {
			return ActorAdminView{}, err
		}
		roles := append([]string{}, existing.Roles...)
		roles = append(roles, role)
		if err := setActorAccessTx(ctx, tx, existing.ID, roles, mergeEmployeePermissions(existing.Permissions, requestedPermissions), "workforce-provision"); err != nil {
			return ActorAdminView{}, err
		}
		if err := tx.Commit(); err != nil {
			return ActorAdminView{}, err
		}
		return r.ActorAdminByID(ctx, existing.ID)
	}

	suffix, err := randomToken(9)
	if err != nil {
		return ActorAdminView{}, err
	}
	actorID := role + "-" + suffix
	permissions, err := providerPermissions(surface)
	if err != nil {
		return ActorAdminView{}, err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version, updated_at)
		VALUES ($1, $2, '', $3, $4, ARRAY[]::text[], '[]'::jsonb, 'PROVISIONED', 1, now())`,
		actorID, username, operatorContextID, phone)
	if err != nil {
		return ActorAdminView{}, mapUniqueViolation(err)
	}
	var requestedPermissions []Permission
	if err := json.Unmarshal(permissions, &requestedPermissions); err != nil {
		return ActorAdminView{}, err
	}
	if err := setActorAccessTx(ctx, tx, actorID, []string{role}, requestedPermissions, "workforce-provision"); err != nil {
		return ActorAdminView{}, err
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{
		ActorID: actorID, Username: username, PhoneE164: phone,
		Roles: []string{role}, Status: ActorStatusProvisioned, Version: 1,
	}, nil
}

func providerPermissions(surface string) ([]byte, error) {
	return json.Marshal([]Permission{
		{Service: "dsh", Surface: surface, Action: "store:read", Scope: "assigned"},
		{Service: "dsh", Surface: surface, Action: "store:write", Scope: "assigned"},
		{Service: "workforce", Surface: surface, Action: "provider:read", Scope: "own"},
		{Service: "workforce", Surface: surface, Action: "provider:update", Scope: "own"},
	})
}

// ActorAdminByID returns the internal projection of an actor, including the
// sovereign phone number, for service-to-service consumers.
func (r *Repository) SearchActors(ctx context.Context, role, q string, limit int) ([]ActorAdminView, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	clauses := []string{"status = 'ACTIVE'"}
	args := []any{}
	if role != "" {
		args = append(args, role)
		clauses = append(clauses, fmt.Sprintf("$%d = ANY(roles)", len(args)))
	}
	if q != "" {
		args = append(args, "%"+q+"%")
		clauses = append(clauses, fmt.Sprintf("(username ILIKE $%d OR COALESCE(phone_e164, '') ILIKE $%d)", len(args), len(args)))
	}
	args = append(args, limit)
	query := `
		SELECT id, username, COALESCE(phone_e164, ''), roles, status, version
		FROM identity_actors
		WHERE ` + strings.Join(clauses, " AND ") + `
		ORDER BY username
		LIMIT $` + strconv.Itoa(len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	views := []ActorAdminView{}
	for rows.Next() {
		var actor Actor
		var roles pq.StringArray
		if err := rows.Scan(&actor.ID, &actor.Username, &actor.PhoneE164, &roles, &actor.Status, &actor.Version); err != nil {
			return nil, err
		}
		actor.Roles = []string(roles)
		views = append(views, toAdminView(actor))
	}
	return views, rows.Err()
}

func (r *Repository) ActorAdminByID(ctx context.Context, actorID string) (ActorAdminView, error) {
	var actor Actor
	var roles pq.StringArray
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, COALESCE(phone_e164, ''), roles, status, version
		FROM identity_actors WHERE id = $1`, actorID).Scan(
		&actor.ID, &actor.Username, &actor.PhoneE164, &roles, &actor.Status, &actor.Version,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ActorAdminView{}, ErrActorNotFound
		}
		return ActorAdminView{}, err
	}
	actor.Roles = []string(roles)
	return toAdminView(actor), nil
}

// SuspendActor suspends authentication for an actor in one transaction.
func (r *Repository) SuspendActor(ctx context.Context, actorID, requestedByActorID, reason, correlationID string) error {
	actorID = strings.TrimSpace(actorID)
	requestedByActorID = strings.TrimSpace(requestedByActorID)
	reason = strings.TrimSpace(reason)
	correlationID = strings.TrimSpace(correlationID)
	if actorID == "" || requestedByActorID == "" || reason == "" || correlationID == "" || len(reason) > 500 || len(correlationID) > 128 {
		return ErrInvalidActorTransition
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var status ActorLifecycleStatus
	var version int
	var operatorContextID string
	var roles pq.StringArray
	err = tx.QueryRowContext(ctx, `
		SELECT status, version, operator_context_id, roles
		FROM identity_actors
		WHERE id = $1
		FOR UPDATE`, actorID).Scan(&status, &version, &operatorContextID, &roles)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrActorNotFound
		}
		return err
	}
	if !hasAnyRole([]string(roles), "field", "captain", "employee") {
		return ErrForbidden
	}
	if err := requireLifecycleRequester(ctx, tx, requestedByActorID, operatorContextID); err != nil {
		return err
	}
	if status != ActorStatusActive {
		var replay bool
		if err := tx.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM identity_actor_lifecycle_events
				WHERE actor_id = $1 AND status = 'suspended'
				  AND requested_by_actor_id = $2 AND reason = $3 AND correlation_id = $4
			)`, actorID, requestedByActorID, reason, correlationID).Scan(&replay); err != nil {
			return err
		}
		if replay {
			return tx.Commit()
		}
		return ErrActorAlreadyDeactivated
	}

	_, err = tx.ExecContext(ctx, `UPDATE identity_actors SET status = 'SUSPENDED', version = version + 1, updated_at = now() WHERE id = $1`, actorID)
	if err != nil {
		return err
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE identity_sessions SET revoked_at = now()
		WHERE actor_id = $1 AND revoked_at IS NULL`, actorID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `
		UPDATE identity_activation_challenges SET status = 'revoked', updated_at = now()
		WHERE actor_id = $1 AND status = 'pending'`, actorID); err != nil {
		return err
	}

	eventID, err := randomToken(16)
	if err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actor_lifecycle_events
			(id, actor_id, status, requested_by_actor_id, reason, correlation_id)
		VALUES ($1, $2, 'suspended', $3, $4, $5)`,
		eventID, actorID, requestedByActorID, reason, correlationID); err != nil {
		return err
	}

	return tx.Commit()
}

// ReactivateActor restores authentication for a previously activated actor.
func (r *Repository) ReactivateActor(ctx context.Context, actorID, requestedByActorID, reason, correlationID string) error {
	actorID = strings.TrimSpace(actorID)
	requestedByActorID = strings.TrimSpace(requestedByActorID)
	reason = strings.TrimSpace(reason)
	correlationID = strings.TrimSpace(correlationID)
	if actorID == "" || requestedByActorID == "" || reason == "" || correlationID == "" || len(reason) > 500 || len(correlationID) > 128 {
		return ErrInvalidActorTransition
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var status ActorLifecycleStatus
	var version int
	var operatorContextID string
	var roles pq.StringArray
	err = tx.QueryRowContext(ctx, `
		SELECT status, version, operator_context_id, roles
		FROM identity_actors
		WHERE id = $1
		FOR UPDATE`, actorID).Scan(&status, &version, &operatorContextID, &roles)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrActorNotFound
		}
		return err
	}
	if !hasAnyRole([]string(roles), "field", "captain", "employee") {
		return ErrForbidden
	}
	if err := requireLifecycleRequester(ctx, tx, requestedByActorID, operatorContextID); err != nil {
		return err
	}
	if status == ActorStatusActive {
		var replay bool
		if err := tx.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM identity_actor_lifecycle_events
				WHERE actor_id = $1 AND status = 'reactivated'
				  AND requested_by_actor_id = $2 AND reason = $3 AND correlation_id = $4
			)`, actorID, requestedByActorID, reason, correlationID).Scan(&replay); err != nil {
			return err
		}
		if replay {
			return tx.Commit()
		}
		return ErrActorAlreadyActive
	}
	if status != ActorStatusSuspended {
		return ErrInvalidActorTransition
	}
	_, err = tx.ExecContext(ctx, `UPDATE identity_actors SET status = 'ACTIVE', version = version + 1, updated_at = now() WHERE id = $1`, actorID)
	if err != nil {
		return err
	}

	eventID, err := randomToken(16)
	if err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actor_lifecycle_events
			(id, actor_id, status, requested_by_actor_id, reason, correlation_id)
		VALUES ($1, $2, 'reactivated', $3, $4, $5)`,
		eventID, actorID, requestedByActorID, reason, correlationID); err != nil {
		return err
	}

	return tx.Commit()
}

func hasAnyRole(roles []string, allowed ...string) bool {
	for _, role := range roles {
		for _, candidate := range allowed {
			if strings.TrimSpace(role) == candidate {
				return true
			}
		}
	}
	return false
}

// requireLifecycleRequester prevents a trusted service caller from recording a
// forged or cross-context human principal in the lifecycle audit trail. The
// outer service authorization still owns action-level permission checks; this
// repository boundary owns durable actor existence, activity, and isolation.
func requireLifecycleRequester(ctx context.Context, tx *sql.Tx, requestedByActorID, operatorContextID string) error {
	var status ActorLifecycleStatus
	err := tx.QueryRowContext(ctx, `
		SELECT status
		FROM identity_actors
		WHERE id = $1 AND operator_context_id = $2`, requestedByActorID, operatorContextID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && status != ActorStatusActive) {
		return ErrForbidden
	}
	return err
}

func (r *Repository) RevokeActivationChallenges(ctx context.Context, actorID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE identity_activation_challenges SET status = 'revoked', updated_at = now()
		WHERE actor_id = $1 AND status = 'pending'`, actorID)
	return err
}

func (r *Repository) LatestActivationForActor(ctx context.Context, actorID string) (ActivationMetadata, error) {
	var meta ActivationMetadata
	err := r.db.QueryRowContext(ctx, `
		SELECT id, status, created_at, expires_at, phone_e164
		FROM identity_activation_challenges
		WHERE actor_id = $1
		ORDER BY created_at DESC
		LIMIT 1`, actorID).Scan(&meta.ActivationID, &meta.Status, &meta.CreatedAt, &meta.ExpiresAt, &meta.MaskedPhone)
	if err != nil {
		return ActivationMetadata{}, err
	}
	if meta.Status == "pending" && meta.ExpiresAt.Before(r.now()) {
		meta.Status = "expired"
	}
	meta.MaskedPhone = maskPhone(meta.MaskedPhone)
	return meta, nil
}

func actorByIDForUpdateTx(ctx context.Context, tx *sql.Tx, actorID string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, password_hash, operator_context_id, COALESCE(phone_e164, ''), roles, permissions, status, version
		FROM identity_actors WHERE id = $1
		FOR UPDATE`, actorID).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.OperatorContextID, &actor.PhoneE164,
		&roles, &permissionsJSON, &actor.Status, &actor.Version,
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

func actorByPhoneAnyRoleTx(ctx context.Context, tx *sql.Tx, phone string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, operator_context_id, COALESCE(phone_e164, ''), roles, permissions, status, version
		FROM identity_actors
		WHERE phone_e164 = $1
		LIMIT 1
		FOR UPDATE`, phone).Scan(
		&actor.ID, &actor.Username, &actor.OperatorContextID, &actor.PhoneE164, &roles, &permissionsJSON, &actor.Status, &actor.Version,
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

func toAdminView(actor Actor) ActorAdminView {
	return ActorAdminView{
		ActorID:   actor.ID,
		Username:  actor.Username,
		PhoneE164: actor.PhoneE164,
		Roles:     actor.Roles,
		Status:    actor.Status,
		Version:   actor.Version,
	}
}

func mapUniqueViolation(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" {
		switch pqErr.Constraint {
		case "identity_actors_username_key":
			return ErrUsernameTaken
		case "identity_actors_phone_e164_idx":
			return ErrPhoneAlreadyBound
		}
	}
	return err
}

func publicActorPermissions(role, surface string) ([]byte, error) {
	switch role {
	case "client":
		return json.Marshal([]Permission{
			{Service: "dsh", Surface: surface, Action: "store:read", Scope: "all"},
		})
	case "partner":
		return json.Marshal([]Permission{
			{Service: "dsh", Surface: surface, Action: "store:read", Scope: "own"},
			{Service: "dsh", Surface: surface, Action: "store:write", Scope: "own"},
		})
	default:
		return nil, ErrInvalidActivation
	}
}

func (r *Repository) ListSessions(ctx context.Context, actorID string) ([]SessionInfo, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(device_fingerprint, ''), surface, version, created_at, access_expires_at, last_used_at, compromised_at
		FROM identity_sessions
		WHERE actor_id = $1 AND revoked_at IS NULL AND refresh_expires_at > now()
		ORDER BY created_at DESC`, actorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []SessionInfo
	for rows.Next() {
		var s SessionInfo
		if err := rows.Scan(&s.SessionID, &s.DeviceFingerprint, &s.Surface, &s.Version, &s.CreatedAt, &s.ExpiresAt, &s.LastUsedAt, &s.CompromisedAt); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (r *Repository) RevokeSession(ctx context.Context, actorID string, sessionID string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = now()
		WHERE id = $1 AND actor_id = $2 AND revoked_at IS NULL`, sessionID, actorID)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return errors.New("session not found")
	}
	return nil
}

func (r *Repository) RevokeAllSessions(ctx context.Context, actorID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = now()
		WHERE actor_id = $1 AND revoked_at IS NULL`, actorID)
	return err
}

func (r *Repository) DeleteAccount(ctx context.Context, actorID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var phone string
	err = tx.QueryRowContext(ctx, `
		SELECT COALESCE(phone_e164, '') FROM identity_actors WHERE id = $1`, actorID).Scan(&phone)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrActorNotFound
		}
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_account_deletions_outbox (actor_id, phone_e164)
		VALUES ($1, $2)`, actorID, phone)
	if err != nil {
		return err
	}

	_, _ = tx.ExecContext(ctx, `UPDATE identity_sessions SET revoked_at = now() WHERE actor_id = $1 AND revoked_at IS NULL`, actorID)
	_, _ = tx.ExecContext(ctx, `UPDATE identity_activation_challenges SET status = 'revoked', updated_at = now() WHERE actor_id = $1 AND status = 'pending'`, actorID)

	_, err = tx.ExecContext(ctx, `DELETE FROM identity_actors WHERE id = $1`, actorID)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) ChangePassword(ctx context.Context, actorID string, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("password must contain at least 6 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE identity_actors
		SET password_hash = $2, updated_at = now()
		WHERE id = $1`, actorID, string(hash))
	return err
}
