package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	_ "github.com/lib/pq"
)

// Helper to open the test database if enabled
func openTestDB(t *testing.T) *sql.DB {
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

// TestActorCanAccessMediaReferenceUnit verifies authorization logic directly
func TestActorCanAccessMediaReferenceUnit(t *testing.T) {
	s := &protectedStoreServer{
		db: nil, // Not needed for unit tests (operator and field)
	}

	ctx := context.Background()

	ref := mediaReference{
		MediaRef:       "ref-123",
		StorageKey:     "key-123",
		OwnerActorID:   "field-1",
		OwnerActorRole: "field",
		PartnerID:      "partner-1",
	}

	// 1. Operator has full download access
	{
		actor := store.StoreActor{ID: "op-1", Role: "operator"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("operator auth err: %v", err)
		}
		if !allowed {
			t.Fatal("operator should be allowed access")
		}
	}

	// 2. Field owner has access
	{
		actor := store.StoreActor{ID: "field-1", Role: "field"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("field owner auth err: %v", err)
		}
		if !allowed {
			t.Fatal("field owner should be allowed access")
		}
	}

	// 3. Field non-owner does not have access
	{
		actor := store.StoreActor{ID: "field-2", Role: "field"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("field non-owner auth err: %v", err)
		}
		if allowed {
			t.Fatal("field non-owner should not be allowed access")
		}
	}

	// 4. Captain does not have access
	{
		actor := store.StoreActor{ID: "captain-1", Role: "captain"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("captain auth err: %v", err)
		}
		if allowed {
			t.Fatal("captain should not be allowed access")
		}
	}

	// 5. Unknown role does not have access
	{
		actor := store.StoreActor{ID: "unknown-1", Role: "unknown"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("unknown role auth err: %v", err)
		}
		if allowed {
			t.Fatal("unknown role should not be allowed access")
		}
	}
}

// TestActorCanAccessMediaReferenceDBIntegration verifies partner DB-based scoping
func TestActorCanAccessMediaReferenceDBIntegration(t *testing.T) {
	db := openTestDB(t)
	s := &protectedStoreServer{db: db}
	ctx := context.Background()

	// Setup clean data
	partnerID := "test-partner-1"
	storeID := "test-store-1"
	actorID := "test-actor-1"
	mediaRefStr := "test-media-ref-1"

	// Insert test store and partner/scope mapping
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id = $1`, actorID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_media_references WHERE media_ref = $1`, mediaRefStr)

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'Test Store for Media', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		storeID, partnerID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes (actor_id, actor_role, store_id, active)
		VALUES ($1, 'partner', $2, true)`,
		actorID, storeID); err != nil {
		t.Fatalf("failed to insert test scope: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id = $1`, actorID) })

	ref := mediaReference{
		MediaRef:       mediaRefStr,
		StorageKey:     "test-key",
		OwnerActorID:   "field-1",
		OwnerActorRole: "field",
		PartnerID:      partnerID,
	}

	// 1. Partner in scope should be allowed
	{
		actor := store.StoreActor{ID: actorID, Role: "partner"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("partner scope verification failed: %v", err)
		}
		if !allowed {
			t.Fatal("partner in scope should be allowed")
		}
	}

	// 2. Partner outside scope (different partner ID or no scopes) should be forbidden
	{
		actor := store.StoreActor{ID: "other-actor-no-scope", Role: "partner"}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("partner out of scope verification failed: %v", err)
		}
		if allowed {
			t.Fatal("partner out of scope should be forbidden")
		}
	}
}

// TestHandleMediaDownloadEndpoint tests the HTTP request handling of download endpoint
func TestHandleMediaDownloadEndpoint(t *testing.T) {
	// Start Mock Identity/Auth Server
	mockAuthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		
		var identity auth.Identity
		switch authHeader {
		case "Bearer operator-token":
			identity = auth.Identity{Subject: "op-1", Roles: []string{"operator"}, AuthState: "authenticated"}
		case "Bearer field-owner-token":
			identity = auth.Identity{Subject: "field-1", Roles: []string{"field"}, AuthState: "authenticated"}
		case "Bearer field-non-owner-token":
			identity = auth.Identity{Subject: "field-2", Roles: []string{"field"}, AuthState: "authenticated"}
		default:
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"message":"unauthenticated"}`))
			return
		}
		_ = json.NewEncoder(w).Encode(identity)
	}))
	defer mockAuthServer.Close()

	authClient := auth.NewClient(mockAuthServer.URL)

	// 1. Missing mediaRef -> returns 400 Bad Request
	{
		s := &protectedStoreServer{
			db:       nil,
			identity: authClient,
			media:    &media.Client{}, // dummy media client so it passes the nil check
		}
		req := httptest.NewRequest(http.MethodGet, "/dsh/media", nil)
		req.Header.Set("Authorization", "Bearer operator-token")
		rec := httptest.NewRecorder()

		s.handleMediaDownload(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	}

	// 2. Media client unconfigured (s.media == nil) -> returns 503 Service Unavailable
	{
		s := &protectedStoreServer{
			db:       nil,
			identity: authClient,
			media:    nil, // unconfigured
		}
		req := httptest.NewRequest(http.MethodGet, "/dsh/media?mediaRef=some-ref", nil)
		req.Header.Set("Authorization", "Bearer operator-token")
		rec := httptest.NewRecorder()

		s.handleMediaDownload(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	}
}

// TestHandleMediaDownloadEndpointDBIntegration verifies DB cases for HTTP download handler
func TestHandleMediaDownloadEndpointDBIntegration(t *testing.T) {
	db := openTestDB(t)

	// Start Mock Identity/Auth Server
	mockAuthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		
		var identity auth.Identity
		switch authHeader {
		case "Bearer operator-token":
			identity = auth.Identity{Subject: "op-1", Roles: []string{"operator"}, AuthState: "authenticated"}
		default:
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_ = json.NewEncoder(w).Encode(identity)
	}))
	defer mockAuthServer.Close()

	authClient := auth.NewClient(mockAuthServer.URL)

	s := &protectedStoreServer{
		db:       db,
		identity: authClient,
		media:    nil, // Keep nil to avoid needing MinIO server, checking error progression
	}

	// Unknown mediaRef (not present in DB) -> returns 404 Not Found
	{
		req := httptest.NewRequest(http.MethodGet, "/dsh/media?mediaRef=totally-unknown-ref-123456", nil)
		req.Header.Set("Authorization", "Bearer operator-token")
		rec := httptest.NewRecorder()

		s.handleMediaDownload(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	}
}
