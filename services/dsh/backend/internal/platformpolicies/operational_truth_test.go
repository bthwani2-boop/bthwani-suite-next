package platformpolicies

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"sync/atomic"
	"testing"
	"time"
)

type scriptedQuery struct {
	err     error
	columns []string
	values  []driver.Value
}

type scriptedDriver struct {
	queries []scriptedQuery
}

func (d *scriptedDriver) Open(string) (driver.Conn, error) {
	queries := append([]scriptedQuery(nil), d.queries...)
	return &scriptedConn{queries: queries}, nil
}

type scriptedConn struct {
	queries []scriptedQuery
	index   int
}

func (c *scriptedConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("prepared statements are not supported")
}
func (c *scriptedConn) Close() error { return nil }
func (c *scriptedConn) Begin() (driver.Tx, error) {
	return nil, errors.New("transactions are not supported")
}

func (c *scriptedConn) QueryContext(context.Context, string, []driver.NamedValue) (driver.Rows, error) {
	if c.index >= len(c.queries) {
		return nil, errors.New("unexpected query")
	}
	query := c.queries[c.index]
	c.index++
	if query.err != nil {
		return nil, query.err
	}
	return &scriptedRows{columns: query.columns, values: query.values}, nil
}

func (c *scriptedConn) CheckNamedValue(*driver.NamedValue) error { return nil }

var scriptedDriverID uint64

func openScriptedDB(t *testing.T, queries ...scriptedQuery) *sql.DB {
	t.Helper()
	name := fmt.Sprintf("platformpolicies-scripted-%d", atomic.AddUint64(&scriptedDriverID, 1))
	sql.Register(name, &scriptedDriver{queries: queries})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatalf("open scripted database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

type scriptedRows struct {
	columns []string
	values  []driver.Value
	read    bool
}

func (r *scriptedRows) Columns() []string { return r.columns }
func (r *scriptedRows) Close() error      { return nil }
func (r *scriptedRows) Next(dest []driver.Value) error {
	if r.read || len(r.values) == 0 {
		return io.EOF
	}
	r.read = true
	copy(dest, r.values)
	return nil
}

func zoneQuery() scriptedQuery {
	now := time.Now().UTC()
	return scriptedQuery{
		columns: []string{"id", "name", "service_area_code", "is_active", "description", "version", "created_at", "updated_at"},
		values:  []driver.Value{"zone-1", "Zone 1", "area-1", true, "", int64(1), now, now},
	}
}

func emptyQuery() scriptedQuery {
	return scriptedQuery{columns: []string{"id"}}
}

func TestEvaluateOperationalPolicyPropagatesSLAReadFailure(t *testing.T) {
	readErr := errors.New("database connection reset during SLA read")
	db := openScriptedDB(t,
		zoneQuery(),
		scriptedQuery{err: readErr},
	)

	decision, err := EvaluateOperationalPolicy(context.Background(), db, OperationalEvaluationInput{
		ZoneID:          "zone-1",
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
	})
	if !errors.Is(err, ErrPolicyTruthUnavailable) {
		t.Fatalf("expected ErrPolicyTruthUnavailable, got decision=%+v err=%v", decision, err)
	}
	if decision.ZoneID != "" || decision.Decision != "" || decision.Serviceable || len(decision.ReasonCodes) != 0 {
		t.Fatalf("policy failure must not return a decision: %+v", decision)
	}
}

func TestEvaluateOperationalPolicyPropagatesCapacityReadFailure(t *testing.T) {
	readErr := errors.New("database timeout during capacity read")
	db := openScriptedDB(t,
		zoneQuery(),
		emptyQuery(),
		scriptedQuery{err: readErr},
	)

	_, err := EvaluateOperationalPolicy(context.Background(), db, OperationalEvaluationInput{
		ZoneID:          "zone-1",
		FulfillmentMode: FulfillmentModeBthwaniDelivery,
	})
	if !errors.Is(err, ErrPolicyTruthUnavailable) {
		t.Fatalf("expected ErrPolicyTruthUnavailable, got %v", err)
	}
}

func TestGetOperationalProfileDistinguishesNoRowFromReadFailure(t *testing.T) {
	noRowsDB := openScriptedDB(t, emptyQuery(), emptyQuery())
	profile, err := GetOperationalProfile(context.Background(), noRowsDB, "zone-1", "default")
	if err != nil {
		t.Fatalf("no-row policy reads must remain a valid unconfigured profile: %v", err)
	}
	if profile.SLA.Configured || profile.Capacity.Configured {
		t.Fatalf("no-row policy reads must not manufacture configuration: %+v", profile)
	}

	readErr := errors.New("database unavailable during capacity read")
	failedDB := openScriptedDB(t, emptyQuery(), scriptedQuery{err: readErr})
	_, err = GetOperationalProfile(context.Background(), failedDB, "zone-1", "default")
	if !errors.Is(err, ErrPolicyTruthUnavailable) {
		t.Fatalf("expected capacity read failure to be unavailable, got %v", err)
	}
}
