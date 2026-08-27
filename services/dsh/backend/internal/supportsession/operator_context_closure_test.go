package supportsession

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"dsh-api/internal/auth"
)

func TestSupportSessionPersistenceFailsClosedWithoutOperatorContext(t *testing.T) {
	ctx := context.Background()
	if _, err := CreateRequest(ctx, nil, "target", "requester", "valid reason", 5); !errors.Is(err, ErrInvalid) {
		t.Fatalf("CreateRequest error = %v, want ErrInvalid", err)
	}
	if _, err := ListRequests(ctx, nil, "", 10); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ListRequests error = %v, want ErrInvalid", err)
	}
	if _, err := ReviewRequest(ctx, nil, "request", "checker", "approved", "", 1); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ReviewRequest error = %v, want ErrInvalid", err)
	}
	if _, err := MarkIssued(ctx, nil, "request", "session", time.Now().UTC()); !errors.Is(err, ErrInvalid) {
		t.Fatalf("MarkIssued error = %v, want ErrInvalid", err)
	}
	if _, err := MarkRevoked(ctx, nil, "request", "actor", "valid revoke reason"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("MarkRevoked error = %v, want ErrInvalid", err)
	}
	if _, err := LoadSnapshot(ctx, nil, "target"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("LoadSnapshot error = %v, want ErrInvalid", err)
	}
	if err := RecordPartnerSupportAccess(ctx, nil, Identity{InitiatorActorID: "actor", SupportRequestID: "request"}, "partner"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("RecordPartnerSupportAccess error = %v, want ErrInvalid", err)
	}
}

func supportSessionTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("DSH_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://dsh_runtime:dsh_runtime_password@localhost:5432/dsh_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("open support-session test db: %v", err)
		}
		t.Skipf("skipping support-session DB test: %v", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		if requireDB {
			t.Fatalf("ping support-session test db: %v", err)
		}
		t.Skipf("skipping support-session DB test: %v", err)
	}
	return db
}

func TestSupportRequestsAreTenantLocalInDB(t *testing.T) {
	db := supportSessionTestDB(t)
	defer db.Close()
	token := fmt.Sprintf("objective3-%d", time.Now().UnixNano())
	targetID := "objective3-shared-target-" + token
	requesterID := "objective3-shared-requester-" + token
	for _, operatorContextID := range []string{"objective3-dsh-tenant-a", "objective3-dsh-tenant-b"} {
		ctx := auth.WithOperatorContext(context.Background(), operatorContextID)
		request, err := CreateRequest(ctx, db, targetID, requesterID, "objective 3 isolation proof", 5)
		if err != nil {
			t.Fatalf("create request for %s: %v", operatorContextID, err)
		}
		if request.OperatorContextID != operatorContextID {
			t.Fatalf("request context=%q, want %q", request.OperatorContextID, operatorContextID)
		}
		requests, err := ListRequests(ctx, db, "pending", 10)
		if err != nil {
			t.Fatalf("list requests for %s: %v", operatorContextID, err)
		}
		if len(requests) != 1 || requests[0].OperatorContextID != operatorContextID {
			t.Fatalf("tenant %s saw %#v", operatorContextID, requests)
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_admin_support_session_requests WHERE target_actor_id=$1 AND operator_context_id IN ('objective3-dsh-tenant-a','objective3-dsh-tenant-b')`, targetID).Scan(&count); err != nil {
		t.Fatalf("count tenant-local requests: %v", err)
	}
	if count != 2 {
		t.Fatalf("tenant-local request count=%d, want 2", count)
	}
}
