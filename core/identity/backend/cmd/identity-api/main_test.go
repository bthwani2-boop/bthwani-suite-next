package main

import "testing"

func TestOpenIdentityDatabaseAllowsFailClosedColdStartWithoutURL(t *testing.T) {
	db, err := openIdentityDatabase("   ")
	if err != nil {
		t.Fatalf("missing database URL must not terminate liveness startup: %v", err)
	}
	if db != nil {
		t.Fatal("missing database URL must produce a nil readiness store")
	}
}

func TestOpenIdentityDatabaseCreatesLazyConfiguredHandle(t *testing.T) {
	db, err := openIdentityDatabase("postgres://identity:identity@127.0.0.1:1/identity?sslmode=disable")
	if err != nil {
		t.Fatalf("valid PostgreSQL configuration should create a lazy handle: %v", err)
	}
	if db == nil {
		t.Fatal("configured database URL did not create a handle")
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close lazy database handle: %v", err)
	}
}
