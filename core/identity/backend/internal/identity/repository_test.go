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

func TestRandomActivationCodeIsSixDigitsAndNeverRetiredCode(t *testing.T) {
	for attempt := 0; attempt < 1000; attempt++ {
		code, err := randomActivationCode()
		if err != nil {
			t.Fatalf("generate activation code: %v", err)
		}
		if len(code) != 6 || strings.Trim(code, "0123456789") != "" {
			t.Fatalf("activation code must be six digits, got %q", code)
		}
		if code == "000000" {
			t.Fatal("retired universal activation code must never be generated")
		}
	}
}

func TestActivationSurfaceRegistryCoversEveryActorType(t *testing.T) {
	tests := map[string]string{
		"client":  "app-client",
		"partner": "app-partner",
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
	if _, ok := activationSurfaceFor("operator"); ok {
		t.Fatal("operator must not be activatable through a mobile activation surface")
	}
}

func TestActivationIssuancePoliciesSeparatePublicAndWorkforceRoles(t *testing.T) {
	for _, role := range []string{"client", "partner"} {
		if !publicOtpActorTypes[role] || workforceManagedActorTypes[role] {
			t.Fatalf("role %q must be public OTP only", role)
		}
	}
	for _, role := range []string{"field", "captain"} {
		if publicOtpActorTypes[role] || !workforceManagedActorTypes[role] {
			t.Fatalf("role %q must be Workforce-managed only", role)
		}
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
	if err := validateExpectedActivationTarget(actor, "partner", "app-partner"); !errors.Is(err, ErrInvalidActivation) {
		t.Fatalf("public actor type must not use Workforce issuance, got %v", err)
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

func TestRequestOtpRejectsWorkforceManagedRolesBeforeDatabaseAccess(t *testing.T) {
	repo := &Repository{}
	for _, role := range []string{"field", "captain"} {
		_, err := repo.RequestOtp(context.Background(), OtpInput{
			ActorType: role,
			Phone:     "+967777123456",
		})
		if !errors.Is(err, ErrInvalidActivation) {
			t.Fatalf("public OTP must reject Workforce role %q, got %v", role, err)
		}
	}
}

func TestConsumeActivationRejectsRetiredCodeWithoutChallenge(t *testing.T) {
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "01234567890123456789012345678901")
	phone := "+967700000001"
	repo := newTestRepository(t, nil)
	fakeDriverInst.setActors(t.Name(), map[string]Actor{
		phone: {
			ID:        "field-actor-1",
			Username:  "field-actor",
			TenantID:  "tenant-1",
			PhoneE164: phone,
			Roles:     []string{"field"},
			Permissions: []Permission{
				{Service: "dsh", Surface: "app-field", Action: "store:read", Scope: "assigned"},
			},
			Active: false,
		},
	})

	pair, err := repo.ConsumeActivation(context.Background(), ConsumeActivationInput{
		ActorType:         "field",
		Phone:             phone,
		Code:              "000000",
		DeviceFingerprint: "device-1",
	})
	if !errors.Is(err, ErrInvalidActivation) {
		t.Fatalf("retired code must not create a session without a challenge, pair=%#v err=%v", pair, err)
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

// Dependency-free fake sql.DB driver used only to exercise repository query
// paths without requiring a live Postgres instance or a new test dependency.
type fakeSessionRow struct {
	hash      string
	actor     Actor
	sessionID string
	expiresAt time.Time
}

var (
	fakeDriverOnce sync.Once
	fakeDriverInst = &fakeIdentityDriver{
		sessions: map[string][]fakeSessionRow{},
		actors:   map[string]map[string]Actor{},
	}
)

type fakeIdentityDriver struct {
	mu       sync.Mutex
	sessions map[string][]fakeSessionRow
	actors   map[string]map[string]Actor
}

func (d *fakeIdentityDriver) Open(name string) (driver.Conn, error) {
	return &fakeConn{driver: d, dsn: name}, nil
}

func (d *fakeIdentityDriver) setRows(dsn string, rows []fakeSessionRow) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.sessions[dsn] = rows
}

func (d *fakeIdentityDriver) setActors(dsn string, actors map[string]Actor) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.actors[dsn] = actors
}

func (d *fakeIdentityDriver) rowsFor(dsn string) []fakeSessionRow {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.sessions[dsn]
}

func (d *fakeIdentityDriver) actorForPhone(dsn, phone string) (Actor, bool) {
	d.mu.Lock()
	defer d.mu.Unlock()
	actor, ok := d.actors[dsn][phone]
	return actor, ok
}

type fakeConn struct {
	driver *fakeIdentityDriver
	dsn    string
}

func (c *fakeConn) Prepare(query string) (driver.Stmt, error) {
	return &fakeStmt{conn: c, query: query}, nil
}
func (c *fakeConn) Close() error { return nil }
func (c *fakeConn) Begin() (driver.Tx, error) {
	return &fakeTx{}, nil
}

type fakeTx struct{}

func (*fakeTx) Commit() error   { return nil }
func (*fakeTx) Rollback() error { return nil }

type fakeStmt struct {
	conn  *fakeConn
	query string
}

func (s *fakeStmt) Close() error  { return nil }
func (s *fakeStmt) NumInput() int { return -1 }
func (s *fakeStmt) Exec([]driver.Value) (driver.Result, error) {
	return fakeResult(1), nil
}
func (s *fakeStmt) Query(args []driver.Value) (driver.Rows, error) {
	if strings.Contains(s.query, "FROM identity_activation_challenges") {
		return &fakeRows{columns: []string{"id", "actor_id", "code_hash", "status", "attempts", "expires_at"}}, nil
	}
	if strings.Contains(s.query, "FROM identity_actors") && strings.Contains(s.query, "phone_e164 = $1") {
		if len(args) == 0 {
			return &fakeRows{columns: actorPhoneColumns()}, nil
		}
		phone, _ := args[0].(string)
		actor, ok := s.conn.driver.actorForPhone(s.conn.dsn, phone)
		if !ok {
			return &fakeRows{columns: actorPhoneColumns()}, nil
		}
		permissions, err := json.Marshal(actor.Permissions)
		if err != nil {
			return nil, err
		}
		return &fakeRows{
			columns: actorPhoneColumns(),
			values: []driver.Value{
				actor.ID,
				actor.Username,
				actor.TenantID,
				actor.PhoneE164,
				"{" + strings.Join(actor.Roles, ",") + "}",
				permissions,
				actor.Active,
			},
		}, nil
	}
	if strings.Contains(s.query, "FROM identity_sessions") {
		if len(args) == 0 {
			return &fakeRows{columns: sessionColumns()}, nil
		}
		hash, _ := args[0].(string)
		for _, row := range s.conn.driver.rowsFor(s.conn.dsn) {
			if row.hash != hash {
				continue
			}
			permissions, err := json.Marshal(row.actor.Permissions)
			if err != nil {
				return nil, err
			}
			return &fakeRows{
				columns: sessionColumns(),
				values: []driver.Value{
					row.actor.ID,
					row.actor.Username,
					row.actor.PasswordHash,
					row.actor.TenantID,
					row.actor.PhoneE164,
					"{" + strings.Join(row.actor.Roles, ",") + "}",
					permissions,
					row.actor.Active,
					row.sessionID,
					row.expiresAt,
				},
			}, nil
		}
		return &fakeRows{columns: sessionColumns()}, nil
	}
	return &fakeRows{columns: []string{"value"}}, nil
}

func actorPhoneColumns() []string {
	return []string{"id", "username", "tenant_id", "phone_e164", "roles", "permissions", "active"}
}

func sessionColumns() []string {
	return []string{"id", "username", "password_hash", "tenant_id", "phone_e164", "roles", "permissions", "active", "session_id", "expires_at"}
}

type fakeResult int64

func (r fakeResult) LastInsertId() (int64, error) { return 0, nil }
func (r fakeResult) RowsAffected() (int64, error) { return int64(r), nil }

type fakeRows struct {
	columns []string
	values  []driver.Value
	done    bool
}

func (r *fakeRows) Columns() []string { return r.columns }
func (r *fakeRows) Close() error      { return nil }
func (r *fakeRows) Next(dest []driver.Value) error {
	if len(r.values) == 0 || r.done {
		return io.EOF
	}
	r.done = true
	copy(dest, r.values)
	return nil
}

func newTestRepository(t *testing.T, rows []fakeSessionRow) *Repository {
	t.Helper()
	fakeDriverOnce.Do(func() {
		sql.Register("identity-fake", fakeDriverInst)
	})
	dsn := t.Name()
	fakeDriverInst.setRows(dsn, rows)
	fakeDriverInst.setActors(dsn, map[string]Actor{})
	db, err := sql.Open("identity-fake", dsn)
	if err != nil {
		t.Fatalf("open fake db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewRepository(db)
}

func TestNormalizePhoneE164RejectsShortNumbers(t *testing.T) {
	_, err := NormalizePhoneE164("123")
	if err == nil {
		t.Fatal("expected error for too-short number, got nil")
	}
}

func TestNormalizePhoneE164Accepts967Prefix(t *testing.T) {
	phone, err := NormalizePhoneE164("967771234567")
	if err != nil {
		t.Fatalf("expected normalization to succeed: %v", err)
	}
	if phone != "+967771234567" {
		t.Fatalf("unexpected result: %q", phone)
	}
}
