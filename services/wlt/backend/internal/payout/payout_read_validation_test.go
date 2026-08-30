package payout

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"wlt-api/internal/shared"
)

type payoutReadQueryDriver struct {
	query string
	args  []driver.NamedValue
}

func (d *payoutReadQueryDriver) Open(string) (driver.Conn, error) {
	return &payoutReadQueryConn{driver: d}, nil
}

type payoutReadQueryConn struct {
	driver *payoutReadQueryDriver
}

func (*payoutReadQueryConn) Prepare(string) (driver.Stmt, error) { return nil, driver.ErrSkip }
func (*payoutReadQueryConn) Close() error                        { return nil }
func (*payoutReadQueryConn) Begin() (driver.Tx, error)           { return nil, driver.ErrSkip }

func (c *payoutReadQueryConn) QueryContext(_ context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	c.driver.query = query
	c.driver.args = append([]driver.NamedValue(nil), args...)
	return &emptyPayoutReadRows{}, nil
}

func (*payoutReadQueryConn) CheckNamedValue(*driver.NamedValue) error { return nil }

type emptyPayoutReadRows struct{}

func (*emptyPayoutReadRows) Columns() []string         { return []string{"id"} }
func (*emptyPayoutReadRows) Close() error              { return nil }
func (*emptyPayoutReadRows) Next([]driver.Value) error { return io.EOF }

func TestHandleListPayoutRequestsUsesStaticBoundQuery(t *testing.T) {
	driverName := "payout-read-query-" + strings.ReplaceAll(t.Name(), "/", "-")
	queryDriver := &payoutReadQueryDriver{}
	sql.Register(driverName, queryDriver)
	db, err := sql.Open(driverName, "")
	if err != nil {
		t.Fatalf("open query test database: %v", err)
	}
	defer db.Close()

	request := httptest.NewRequest(http.MethodGet, "/payouts?beneficiaryActorId=actor-1&beneficiaryActorType=PARTNER&status=pending", nil)
	request = request.WithContext(shared.WithOperatorContext(request.Context(), "operator-context-1"))
	response := httptest.NewRecorder()
	HandleListPayoutRequests(db)(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d, want 200, body=%s", response.Code, response.Body.String())
	}
	if queryDriver.query != payoutListQuery {
		t.Fatalf("list query was not the canonical static query: %q", queryDriver.query)
	}
	if len(queryDriver.args) != 6 {
		t.Fatalf("query args=%d, want 6", len(queryDriver.args))
	}
	for index, want := range []any{"operator-context-1", true, "actor-1", "partner", true, "pending"} {
		if got := queryDriver.args[index].Value; got != want {
			t.Fatalf("query arg %d=%v, want %v", index, got, want)
		}
	}
}

func TestHandleListPayoutRequestsRejectsInvalidFiltersBeforeDatabase(t *testing.T) {
	tests := []struct {
		name string
		path string
	}{
		{name: "actor id without type", path: "/payouts?beneficiaryActorId=actor-1"},
		{name: "actor type without id", path: "/payouts?beneficiaryActorType=partner"},
		{name: "unsupported actor type", path: "/payouts?beneficiaryActorId=actor-1&beneficiaryActorType=unknown"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tc.path, nil)
			request = request.WithContext(shared.WithOperatorContext(request.Context(), "operator-context-1"))
			response := httptest.NewRecorder()

			HandleListPayoutRequests(nil)(response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("status=%d, want 400, body=%s", response.Code, response.Body.String())
			}
		})
	}
}

func TestHandleGetPayoutRequestRequiresOperatorContextAndID(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/payouts/", nil)
	response := httptest.NewRecorder()
	HandleGetPayoutRequest(nil)(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("without operator context status=%d, want 400", response.Code)
	}

	request = httptest.NewRequest(http.MethodGet, "/payouts/", nil)
	request = request.WithContext(shared.WithOperatorContext(request.Context(), "operator-context-1"))
	response = httptest.NewRecorder()
	HandleGetPayoutRequest(nil)(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("without payout id status=%d, want 400", response.Code)
	}
}
