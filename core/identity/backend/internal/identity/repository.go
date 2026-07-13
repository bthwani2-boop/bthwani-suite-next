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
	ErrUnauthenticated        = errors.New("unauthenticated")
	ErrInvalidRefresh         = errors.New("invalid refresh token")
	ErrForbidden              = errors.New("forbidden")
	ErrInvalidActivation      = errors.New("invalid activation")
	ErrActivationRateLimited  = errors.New("activation rate limited")
	ErrActivationUnavailable  = errors.New("activation unavailable")
	ErrActivationTargetAbsent = errors.New("activation target absent")
	ErrLoginRateLimited       = errors.New("login rate limited")
	ErrPhoneAlreadyBound      = errors.New("phone already bound to another actor")
	ErrUsernameTaken          = errors.New("username already taken")
	ErrActorNotFound          = errors.New("actor not found")
)

// activationSurfaceByActorType is the single source for which surface each
// activatable actor type belongs to. Public issuance by phone is intentionally
// disabled for provider roles; Workforce must make a typed actor-bound request.
var activationSurfaceByActorType = map[string]string{
	"field":   "app-field",
	"captain": "app-captain",
}

func activationSurfaceFor(actorType string) (string, bool) {
	surface, ok := activationSurfaceByActorType[actorType]
	return surface, ok
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
		actorPermissions := []Permission{
			{Service: "dsh", Surface: actor.surface, Action: "store:read", Scope: actor.scope},
			{Service: "dsh", Surface: actor.surface, Action: "store:write", Scope: actor.scope},
		}
		if actor.role == "operator" {
			actorPermissions = append(actorPermissions,
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:read", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:create", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:update", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:suspend", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:reactivate", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider.activation:issue", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "reference:manage", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "audit:read", Scope: "all"},
			)
		}
		if actor.role == "field" || actor.role == "captain" {
			actorPermissions = append(actorPermissions,
				Permission{Service: "workforce", Surface: actor.surface, Action: "provider:read", Scope: "own"},
				Permission{Service: "workforce", Surface: actor.surface, Action: "provider:update", Scope: "own"},
			)
		}
		permissions, marshalErr := json.Marshal(actorPermissions)
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

// IssueActivationForActor issues an activation challenge for a specific actor
// id. This is the internal (service-to-service) path used by Workforce: the
// caller references the provider's actor id and Identity resolves the phone
// sovereignly, so no phone ever travels from another service as input.
// IssuedByActorID must reference the operator actor on whose behalf the
// calling service acts (kept for the audit FK on the challenge row). The
// expected type/surface are mandatory so multi-role actors cannot receive a
// code for whichever role happens to appear first.
func (r *Repository) IssueActivationForActor(ctx context.Context, actorID string, input IssueActivationForActorInput, idempotencyKey, correlationID string) (IssueActivationResult, error) {
	if len(r.activationSecret) < 32 {
		return IssueActivationResult{}, ErrActivationUnavailable
	}
	expectedActorType := strings.TrimSpace(input.ExpectedActorType)
	expectedSurface := strings.TrimSpace(input.ExpectedSurface)
	canonicalSurface, ok := activationSurfaceFor(expectedActorType)
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
	canonicalSurface, ok := activationSurfaceFor(strings.TrimSpace(expectedActorType))
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
// pending challenge for the same actor type + phone, and inserts the new one.
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
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_activation_challenges
			(id, actor_id, actor_type, phone_e164, surface, code_hash, expires_at,
			 issued_by_actor_id, idempotency_key, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''))`,
		activationID, actor.ID, actorType, phone, surface,
		r.activationCodeHash(actorType, phone, code), expiresAt,
		issuedByActorID, strings.TrimSpace(idempotencyKey), strings.TrimSpace(correlationID))
	if err != nil {
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

// ProvisionActor creates an inactive actor for a workforce-managed provider.
// The actor stays active=false until the provider consumes an activation code
// (ConsumeActivation flips it to true), so a provisioned-but-never-activated
// provider can never log in or refresh. The call is idempotent: if the phone
// is already bound to an actor holding the requested role, that actor is
// returned unchanged; if the phone belongs to an actor without the role, the
// requested provider role and surface permissions are attached to the same
// actor so one phone never creates duplicate identities.
func (r *Repository) ProvisionActor(ctx context.Context, input ProvisionActorInput) (ActorAdminView, error) {
	role := strings.TrimSpace(input.Role)
	surface, ok := activationSurfaceByActorType[role]
	if !ok {
		return ActorAdminView{}, ErrInvalidActivation
	}
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}
	tenantID := strings.TrimSpace(input.TenantID)
	if tenantID == "" {
		tenantID = "local-dsh"
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
		_, err = tx.ExecContext(ctx, `
			UPDATE identity_actors
			SET roles = array_append(roles, $2),
			    permissions = permissions || $3::jsonb,
			    updated_at = now()
			WHERE id = $1 AND NOT ($2 = ANY(roles))`,
			existing.ID, role, string(permissionsJSON))
		if err != nil {
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
			(id, username, password_hash, tenant_id, phone_e164, roles, permissions, active, updated_at)
		VALUES ($1, $2, '', $3, $4, $5, $6::jsonb, false, now())`,
		actorID, username, tenantID, phone, pq.Array([]string{role}), string(permissions))
	if err != nil {
		return ActorAdminView{}, mapUniqueViolation(err)
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{
		ActorID: actorID, Username: username, PhoneE164: phone,
		Roles: []string{role}, Active: false,
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
// SearchActors backs Workforce's supervisor picker (role + free-text query
// on username/phone), replacing the old raw actor-id text box. Password
// hashes are never selected.
func (r *Repository) SearchActors(ctx context.Context, role, q string, limit int) ([]ActorAdminView, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	clauses := []string{"active"}
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
		SELECT id, username, COALESCE(phone_e164, ''), roles, active
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
		if err := rows.Scan(&actor.ID, &actor.Username, &actor.PhoneE164, &roles, &actor.Active); err != nil {
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
		SELECT id, username, COALESCE(phone_e164, ''), roles, active
		FROM identity_actors WHERE id = $1`, actorID).Scan(
		&actor.ID, &actor.Username, &actor.PhoneE164, &roles, &actor.Active,
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

// DeactivateActor suspends authentication for an actor in one transaction:
// the actor is marked inactive (Login/Refresh/ResolveAccessToken all reject
// inactive actors), every live session is revoked, and any pending activation
// challenge is revoked so a previously issued code cannot resurrect access.
func (r *Repository) DeactivateActor(ctx context.Context, actorID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		UPDATE identity_actors SET active = false, updated_at = now() WHERE id = $1`, actorID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrActorNotFound
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
	return tx.Commit()
}

// ReactivateActor restores authentication for a previously activated actor
// (e.g. a suspended provider being reinstated). It does not create sessions;
// the actor logs in again through the normal flows.
func (r *Repository) ReactivateActor(ctx context.Context, actorID string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE identity_actors SET active = true, updated_at = now() WHERE id = $1`, actorID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return ErrActorNotFound
	}
	return nil
}

// RevokeActivationChallenges cancels all pending activation codes for an
// actor without touching the actor's active flag or sessions.
func (r *Repository) RevokeActivationChallenges(ctx context.Context, actorID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE identity_activation_challenges SET status = 'revoked', updated_at = now()
		WHERE actor_id = $1 AND status = 'pending'`, actorID)
	return err
}

func actorByIDForUpdateTx(ctx context.Context, tx *sql.Tx, actorID string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	var permissionsJSON []byte
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, password_hash, tenant_id, COALESCE(phone_e164, ''), roles, permissions, active
		FROM identity_actors WHERE id = $1
		FOR UPDATE`, actorID).Scan(
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

func actorByPhoneAnyRoleTx(ctx context.Context, tx *sql.Tx, phone string) (Actor, error) {
	var actor Actor
	var roles pq.StringArray
	err := tx.QueryRowContext(ctx, `
		SELECT id, username, COALESCE(phone_e164, ''), roles, active
		FROM identity_actors
		WHERE phone_e164 = $1
		LIMIT 1
		FOR UPDATE`, phone).Scan(
		&actor.ID, &actor.Username, &actor.PhoneE164, &roles, &actor.Active,
	)
	if err != nil {
		return Actor{}, err
	}
	actor.Roles = []string(roles)
	return actor, nil
}

func toAdminView(actor Actor) ActorAdminView {
	return ActorAdminView{
		ActorID:   actor.ID,
		Username:  actor.Username,
		PhoneE164: actor.PhoneE164,
		Roles:     actor.Roles,
		Active:    actor.Active,
	}
}

// mapUniqueViolation converts Postgres unique-constraint failures on the
// actors table into the matching sentinel error.
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
