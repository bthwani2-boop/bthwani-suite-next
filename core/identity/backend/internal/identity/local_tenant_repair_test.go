package identity

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"strings"
	"sync"
	"testing"
)

func TestNormalizeLocalBootstrapTenantID(t *testing.T) {
	tenantID, err := normalizeLocalBootstrapTenantID("  local-dsh  ")
	if err != nil {
		t.Fatalf("expected configured tenant to normalize: %v", err)
	}
	if tenantID != "local-dsh" {
		t.Fatalf("expected local-dsh, got %q", tenantID)
	}
	if _, err := normalizeLocalBootstrapTenantID("   "); err == nil {
		t.Fatal("blank bootstrap tenant must be rejected")
	}
}

func TestLocalBootstrapActorTenantRepairCoversAllLocalSurfaces(t *testing.T) {
	expected := map[string]bool{
		"operator-local-001":                 false,
		"partner-local-001":                  false,
		"field-local-001":                    false,
		"captain-local-001":                  false,
		"client-local-001":                   false,
		"platform-approver-local-001":        false,
		"platform-applier-local-001":         false,
		"platform-rollout-manager-local-001": false,
	}
	for _, actorID := range localBootstrapActorIDs {
		if _, ok := expected[actorID]; !ok {
			t.Fatalf("unexpected local bootstrap actor %q", actorID)
		}
		expected[actorID] = true
	}
	for actorID, covered := range expected {
		if !covered {
			t.Fatalf("local bootstrap tenant repair does not cover %q", actorID)
		}
	}
}

func TestRepairLocalBootstrapTenantUpdatesPersistedActors(t *testing.T) {
	db := openTenantRepairTestDB(t)
	repo := NewRepository(db)

	if err := repo.RepairLocalBootstrapTenant(context.Background(), LocalBootstrap{Enabled: true}, " local-dsh "); err != nil {
		t.Fatalf("repair local bootstrap tenant: %v", err)
	}
	query, args, calls := tenantRepairSQLCapture.snapshot()
	if calls != 1 {
		t.Fatalf("expected one repair statement, got %d", calls)
	}
	if !strings.Contains(query, "UPDATE identity_actors") || !strings.Contains(query, "tenant_id IS DISTINCT FROM") {
		t.Fatalf("unexpected repair query: %s", query)
	}
	if len(args) != 2 || args[0].Value != "local-dsh" {
		t.Fatalf("unexpected repair arguments: %#v", args)
	}

	if err := repo.RepairLocalBootstrapTenant(context.Background(), LocalBootstrap{Enabled: false}, "local-dsh"); err != nil {
		t.Fatalf("disabled repair should be a no-op: %v", err)
	}
	_, _, callsAfterDisabled := tenantRepairSQLCapture.snapshot()
	if callsAfterDisabled != 1 {
		t.Fatalf("disabled bootstrap executed an unexpected statement; calls=%d", callsAfterDisabled)
	}
}

const tenantRepairDriverName = "identity-local-tenant-repair-test"

var (
	tenantRepairDriverOnce sync.Once
	tenantRepairSQLCapture = &repairSQLCapture{}
)

type repairSQLCapture struct {
	mu    sync.Mutex
	query string
	args  []driver.NamedValue
	calls int
}

func (c *repairSQLCapture) reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.query = ""
	c.args = nil
	c.calls = 0
}

func (c *repairSQLCapture) record(query string, args []driver.NamedValue) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.query = query
	c.args = append([]driver.NamedValue(nil), args...)
	c.calls++
}

func (c *repairSQLCapture) snapshot() (string, []driver.NamedValue, int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.query, append([]driver.NamedValue(nil), c.args...), c.calls
}

type tenantRepairDriver struct{}

type tenantRepairConn struct{}

func (*tenantRepairDriver) Open(string) (driver.Conn, error) { return &tenantRepairConn{}, nil }
func (*tenantRepairConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("prepare is not supported")
}
func (*tenantRepairConn) Close() error              { return nil }
func (*tenantRepairConn) Begin() (driver.Tx, error) { return nil, errors.New("transactions are not supported") }
func (*tenantRepairConn) ExecContext(_ context.Context, query string, args []driver.NamedValue) (driver.Result, error) {
	tenantRepairSQLCapture.record(query, args)
	return driver.RowsAffected(1), nil
}

func openTenantRepairTestDB(t *testing.T) *sql.DB {
	t.Helper()
	tenantRepairDriverOnce.Do(func() { sql.Register(tenantRepairDriverName, &tenantRepairDriver{}) })
	tenantRepairSQLCapture.reset()
	db, err := sql.Open(tenantRepairDriverName, "tenant-repair")
	if err != nil {
		t.Fatalf("open tenant repair test db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

var _ driver.ExecerContext = (*tenantRepairConn)(nil)
