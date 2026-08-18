package fieldassignment

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestCreateReadbackPreservesBusinessAndStoreHints(t *testing.T) {
	db := openRequiredDB(t)
	key := fmt.Sprintf("fieldassignment-readback-%d", time.Now().UnixNano())
	assignment, err := Create(t.Context(), db, "local-dsh", "field-readback-test", CreateInput{
		FieldActorID:    "field-readback-test",
		BusinessTaskKey: key,
		StoreNameHint:   "Readback Store",
		PhoneHint:       "+967770000099",
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id = $1`, assignment.ID) })

	if assignment.BusinessTaskKey != key || assignment.StoreNameHint != "Readback Store" {
		t.Fatalf("create readback swapped fields: businessTaskKey=%q storeNameHint=%q", assignment.BusinessTaskKey, assignment.StoreNameHint)
	}
	readback, err := Get(t.Context(), db, "local-dsh", assignment.ID)
	if err != nil {
		t.Fatal(err)
	}
	if readback.BusinessTaskKey != key || readback.StoreNameHint != "Readback Store" {
		t.Fatalf("stored readback swapped fields: businessTaskKey=%q storeNameHint=%q", readback.BusinessTaskKey, readback.StoreNameHint)
	}
}
