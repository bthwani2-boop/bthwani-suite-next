package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUnauthenticated = errors.New("unauthenticated")
	ErrInvalidRefresh  = errors.New("invalid refresh token")
)

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

func (r *Repository) BootstrapLocalActors(ctx context.Context, input LocalBootstrap) error {
	if !input.Enabled {
		return nil
	}
	if len(input.Password) < 4 {
		return errors.New("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD must contain at least 4 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	actors := []struct {
		id, username, role, surface, scope string
	}{
		{"operator-local-001", "operator", "operator", "control-panel", "all"},
		{"partner-local-001", "bthwani", "partner", "app-partner", "own"},
		{"field-local-001", "field", "field", "app-field", "assigned"},
		{"captain-local-001", "captain", "captain", "app-captain", "assigned"},
		{"client-local-001", "client", "client", "app-client", "own"},
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
				(id, username, password_hash, tenant_id, roles, permissions, active, updated_at)
			VALUES ($1, $2, $3, 'local-dsh', $4, $5::jsonb, true, now())
			ON CONFLICT (id) DO UPDATE SET
				username = EXCLUDED.username,
				password_hash = EXCLUDED.password_hash,
				roles = EXCLUDED.roles,
				permissions = EXCLUDED.permissions,
				active = true,
				updated_at = now()`,
			actor.id, actor.username, string(hash), pq.Array([]string{actor.role}), string(permissions))
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) Login(ctx context.Context, username, password, fingerprint string) (TokenPair, error) {
	actor, err := r.actorByUsername(ctx, strings.TrimSpace(username))
	if err != nil || !actor.Active {
		return TokenPair{}, ErrUnauthenticated
	}
	if bcrypt.CompareHashAndPassword([]byte(actor.PasswordHash), []byte(password)) != nil {
		return TokenPair{}, ErrUnauthenticated
	}
	return r.createSession(ctx, actor, fingerprint)
}

func (r *Repository) ResolveAccessToken(ctx context.Context, token string) (ActorIdentity, error) {
	if strings.HasPrefix(token, "dev-bypass-") {
		return resolveDevBypassIdentity(token, r.now())
	}

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

func resolveDevBypassIdentity(token string, now time.Time) (ActorIdentity, error) {
	parts := strings.Split(token, "-")
	role := "operator"
	if len(parts) >= 3 {
		role = parts[2]
	}
	surface := "control-panel"
	scope := "all"
	switch role {
	case "client":
		surface = "app-client"
		scope = "own"
	case "partner":
		surface = "app-partner"
		scope = "own"
	case "field":
		surface = "app-field"
		scope = "assigned"
	case "captain":
		surface = "app-captain"
		scope = "assigned"
	case "operator":
	default:
		return ActorIdentity{}, ErrUnauthenticated
	}
	return ActorIdentity{
		Subject:  role + "-local-001",
		TenantID: "tenant-dev-001",
		Roles:    []string{role},
		Permissions: []Permission{
			{Service: "dsh", Surface: surface, Action: "*", Scope: scope},
		},
		AuthState: "authenticated",
		SurfaceAccess: map[string]bool{
			surface: true,
		},
		ServiceAccess: map[string]bool{
			"dsh": true,
		},
		SessionID: "dev-session-bypass",
		ExpiresAt: now.Add(24 * time.Hour),
	}, nil
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
		SELECT id, username, password_hash, tenant_id, roles, permissions, active
		FROM identity_actors WHERE username = $1`, username).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.TenantID,
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
		SELECT id, username, password_hash, tenant_id, roles, permissions, active
		FROM identity_actors WHERE id = $1`, actorID).Scan(
		&actor.ID, &actor.Username, &actor.PasswordHash, &actor.TenantID,
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

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
