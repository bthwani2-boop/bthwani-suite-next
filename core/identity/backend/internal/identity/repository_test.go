package identity

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestTokenHashDoesNotExposeToken(t *testing.T) {
	token := "secret-access-token"
	hash := tokenHash(token)
	if hash == token || len(hash) != 64 {
		t.Fatalf("unexpected token hash: %q", hash)
	}
	if hash != tokenHash(token) {
		t.Fatal("token hashing must be deterministic")
	}
}

func TestNormalizePhoneE164AcceptsYemenLocalNumbers(t *testing.T) {
	phone, err := NormalizePhoneE164("777 123 456")
	if err != nil {
		t.Fatalf("expected phone to normalize: %v", err)
	}
	if phone != "+967777123456" {
		t.Fatalf("unexpected normalized phone: %q", phone)
	}
}

func TestActivationCodeHashDoesNotExposeCode(t *testing.T) {
	repo := &Repository{activationSecret: []byte("01234567890123456789012345678901")}
	hash := repo.activationCodeHash("field", "+967777123456", "123456")
	if hash == "123456" || len(hash) != 64 {
		t.Fatalf("unexpected activation hash: %q", hash)
	}
	if hash != repo.activationCodeHash("field", "+967777123456", "123456") {
		t.Fatal("activation hashing must be deterministic")
	}
}

func TestRandomActivationCodeIsSixDigits(t *testing.T) {
	code, err := randomActivationCode()
	if err != nil {
		t.Fatalf("generate activation code: %v", err)
	}
	if len(code) != 6 || strings.Trim(code, "0123456789") != "" {
		t.Fatalf("activation code must be six digits, got %q", code)
	}
}

func TestActivationSurfaceForProviderRoles(t *testing.T) {
	tests := map[string]string{
		"field":   "app-field",
		"captain": "app-captain",
	}
	for actorType, expectedSurface := range tests {
		t.Run(actorType, func(t *testing.T) {
			surface, ok := activationSurfaceFor(actorType)
			if !ok || surface != expectedSurface {
				t.Fatalf("expected %s surface %q, got %q ok=%v", actorType, expectedSurface, surface, ok)
			}
		})
	}
}

func TestValidateExpectedActivationTargetIgnoresRoleOrder(t *testing.T) {
	actor := Actor{
		ID:        "actor-1",
		PhoneE164: "+967777123456",
		Roles:     []string{"field", "captain"},
	}

	if err := validateExpectedActivationTarget(actor, "captain", "app-captain"); err != nil {
		t.Fatalf("captain target should validate even when field is first: %v", err)
	}
	if err := validateExpectedActivationTarget(actor, "field", "app-field"); err != nil {
		t.Fatalf("field target should validate: %v", err)
	}
	if err := validateExpectedActivationTarget(actor, "captain", "app-field"); !errors.Is(err, ErrInvalidActivation) {
		t.Fatalf("wrong surface should be rejected, got %v", err)
	}
}

func TestScopedActivationIdempotencyKeyIncludesTypeAndSurface(t *testing.T) {
	got := scopedActivationIdempotencyKey("request-1", "captain", "app-captain")
	if got != "captain:app-captain:request-1" {
		t.Fatalf("unexpected scoped idempotency key %q", got)
	}
	if scopedActivationIdempotencyKey("", "captain", "app-captain") != "" {
		t.Fatal("empty idempotency key must stay empty")
	}
}

func TestActorIdentityDerivesSurfaceAndServiceAccess(t *testing.T) {
	expiresAt := time.Now().Add(time.Minute)
	resolved := toIdentity(Actor{
		ID:       "partner-1",
		TenantID: "tenant-1",
		Roles:    []string{"partner"},
		Permissions: []Permission{
			{Service: "dsh", Surface: "app-partner", Action: "store:write", Scope: "own"},
		},
	}, "session-1", expiresAt)

	if !resolved.SurfaceAccess["app-partner"] || !resolved.ServiceAccess["dsh"] {
		t.Fatalf("derived access is incomplete: %#v", resolved)
	}
	if resolved.AuthState != "authenticated" || resolved.Subject != "partner-1" {
		t.Fatalf("unexpected identity: %#v", resolved)
	}
}

func TestResolveAccessTokenRejectsForgedDevBypassTokens(t *testing.T) {
	repo := newTestRepository(t, nil)

	forged := []string{
		"dev-bypass-operator-anything",
		"dev-bypass-field-anything",
		"dev-bypass-operator-" + tokenHash("operator-local-001"),
	}
	for _, token := range forged {
		t.Run(token, func(t *testing.T) {
			if _, err := repo.ResolveAccessToken(context.Background(), token); !errors.Is(err, ErrUnauthenticated) {
				t.Fatalf("expected forged dev-bypass token to be rejected, got %v", err)
			}
		})
	}
}

func TestResolveAccessTokenRejectsRandomToken(t *testing.T) {
	repo := newTestRepository(t, nil)

	if _, err := repo.ResolveAccessToken(context.Background(), "totally-random-garbage-token"); !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("expected random token to be rejected, got %v", err)
	}
}

func TestResolveAccessTokenAcceptsRealSessionToken(t *testing.T) {
	token := "real-access-token"
	expiresAt := time.Now().Add(15 * time.Minute)
	repo := newTestRepository(t, []fakeSessionRow{
		{
			hash: tokenHash(token),
			actor: Actor{
				ID:       "operator-local-001",
				Username: "operator",
				TenantID: "local-dsh",
				Roles:    []string{"operator"},
				Permissions: []Permission{
					{Service: "dsh", Surface: "control-panel", Action: "store:read", Scope: "all"},
				},
				Active: true,
			},
			sessionID: "session-real-1",
			expiresAt: expiresAt,
		},
	})

	identity, err := repo.ResolveAccessToken(context.Background(), token)
	if err != nil {
		t.Fatalf("expected real session token to resolve, got %v", err)
	}
	if identity.Subject != "operator-local-001" || identity.AuthState != "authenticated" {
		t.Fatalf("unexpected identity: %#v", identity)
	}
	if len(identity.Permissions) != 1 || identity.Permissions[0].Action == "*" {
		t.Fatalf("expected exact permission grant, not wildcard: %#v", identity.Permissions)
	}
}

// --- dependency-free fake sql.DB driver used only to exercise ResolveAccessToken's
// real query path without requiring a live Postgres instance or a new test dependency. ---

type fakeSessionRow struct {
	hash      string
	actor     Actor
	sessionID string
	expiresAt time.Time
}

var (
	fakeDriverOnce sync.Once
	fakeDriverInst = &fakeIdentityDriver{data: map[string][]fakeSessionRow{}}
)

type fakeIdentityDriver struct {
	mu   sync.Mutex
	data map[string][]fakeSessionRow
}

func (d *fakeIdentityDriver) Open(name string) (driver.Conn, error) {
	return &fakeConn{driver: d, dsn: name}, nil
}

func (d *fakeIdentityDriver) setRows(dsn string, rows []fakeSessionRow) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.data[dsn] = rows
}

func (d *fakeIdentityDriver) rowsFor(dsn string) []fakeSessionRow {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.data[dsn]
}

type fakeConn struct {
	driver *fakeIdentityDriver
	dsn    string
}

func (c *fakeConn) Prepare(query string) (driver.Stmt, error) { return &fakeStmt{conn: c}, nil }
func (c *fakeConn) Close() error                              { return nil }
func (c *fakeConn) Begin() (driver.Tx, error)                 { return nil, errors.New("transactions not supported") }

type fakeStmt struct{ conn *fakeConn }

func (s *fakeStmt) Close() error  { return nil }
func (s *fakeStmt) NumInput() int { return -1 }
func (s *fakeStmt) Exec(args []driver.Value) (driver.Result, error) {
	return nil, errors.New("exec not supported")
}
func (s *fakeStmt) Query(args []driver.Value) (driver.Rows, error) {
	if len(args) == 0 {
		return &fakeRows{}, nil
	}
	hash, _ := args[0].(string)
	for _, row := range s.conn.driver.rowsFor(s.conn.dsn) {
		if row.hash == hash {
			match := row
			return &fakeRows{row: &match}, nil
		}
	}
	return &fakeRows{}, nil
}

type fakeRows struct {
	row  *fakeSessionRow
	done bool
}

func (r *fakeRows) Columns() []string {
	return []string{"id", "username", "password_hash", "tenant_id", "roles", "permissions", "active", "session_id", "expires_at"}
}
func (r *fakeRows) Close() error { return nil }
func (r *fakeRows) Next(dest []driver.Value) error {
	if r.row == nil || r.done {
		return io.EOF
	}
	r.done = true
	permissions, err := json.Marshal(r.row.actor.Permissions)
	if err != nil {
		return err
	}
	dest[0] = r.row.actor.ID
	dest[1] = r.row.actor.Username
	dest[2] = r.row.actor.PasswordHash
	dest[3] = r.row.actor.TenantID
	dest[4] = "{" + strings.Join(r.row.actor.Roles, ",") + "}"
	dest[5] = permissions
	dest[6] = r.row.actor.Active
	dest[7] = r.row.sessionID
	dest[8] = r.row.expiresAt
	return nil
}

func newTestRepository(t *testing.T, rows []fakeSessionRow) *Repository {
	t.Helper()
	fakeDriverOnce.Do(func() {
		sql.Register("identity-fake", fakeDriverInst)
	})
	dsn := t.Name()
	fakeDriverInst.setRows(dsn, rows)
	db, err := sql.Open("identity-fake", dsn)
	if err != nil {
		t.Fatalf("open fake db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewRepository(db)
}
