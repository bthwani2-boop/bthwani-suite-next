package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	_ "github.com/lib/pq"
)

func TestPrepareMediaUploadBodyAcceptsAllowedDetectedTypes(t *testing.T) {
	pngBody := append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, []byte("image-body")...)
	body, contentType, err := prepareMediaUploadBody(bytes.NewReader(pngBody), "application/octet-stream")
	if err != nil {
		t.Fatalf("prepareMediaUploadBody() error = %v", err)
	}
	if contentType != "image/png" {
		t.Fatalf("contentType = %q, want image/png", contentType)
	}
	got, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("ReadAll() error = %v", err)
	}
	if !bytes.Equal(got, pngBody) {
		t.Fatal("prepared upload body did not preserve original bytes")
	}
}

func TestPrepareMediaUploadBodyAcceptsPDF(t *testing.T) {
	_, contentType, err := prepareMediaUploadBody(bytes.NewReader([]byte("%PDF-1.7\nbody")), "")
	if err != nil {
		t.Fatalf("prepareMediaUploadBody() error = %v", err)
	}
	if contentType != "application/pdf" {
		t.Fatalf("contentType = %q, want application/pdf", contentType)
	}
}

func TestPrepareMediaUploadBodyRejectsUnsafeTypes(t *testing.T) {
	for name, tc := range map[string]struct {
		body     []byte
		declared string
	}{
		"html": {
			body: []byte("<!doctype html><html><body>x</body></html>"),
		},
		"video": {
			body:     append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, []byte("image-body")...),
			declared: "video/mp4",
		},
		"svg": {
			body:     append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, []byte("image-body")...),
			declared: "image/svg+xml",
		},
	} {
		t.Run(name, func(t *testing.T) {
			if _, _, err := prepareMediaUploadBody(bytes.NewReader(tc.body), tc.declared); err == nil {
				t.Fatal("prepareMediaUploadBody() error = nil, want rejection")
			}
		})
	}
}

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

func TestActorCanAccessMediaReferenceUnit(t *testing.T) {
	s := &protectedStoreServer{db: nil}
	ctx := context.Background()
	ref := mediaReference{
		MediaRef:       "ref-123",
		StorageKey:     "key-123",
		OwnerActorID:   "field-1",
		OwnerActorRole: "field",
		PartnerID:      "",
	}

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

func TestActorCanAccessMediaReferenceDBIntegration(t *testing.T) {
	db := openTestDB(t)
	s := &protectedStoreServer{db: db}
	ctx := context.Background()
	partnerID := "test-partner-1"
	storeID := "test-store-1"
	actorID := "test-actor-1"
	operatorContextID := "local-dsh"
	mediaRefStr := "test-media-ref-1"

	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_store_actor_scopes WHERE actor_id = $1`, actorID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_media_references WHERE media_ref = $1`, mediaRefStr)
	_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, partnerID)

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners (id, operator_context_id, legal_name_ar, legal_name_en, display_name, legal_identity_type, legal_identity_number, owner_name, primary_phone, email, category)
		VALUES ($1, $2, 'شريك تجريبي', 'Test Partner', 'Test Partner', 'commercial_register', '12345', 'Owner', '+967770000000', 'test@local.test', 'restaurant')`,
		partnerID, operatorContextID); err != nil {
		t.Fatalf("failed to insert test partner: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, partnerID) })

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, operator_context_id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $3, $1, 'Test Store for Media', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		storeID, partnerID, operatorContextID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_store_actor_scopes (operator_context_id, actor_id, actor_role, store_id, scope_type, active)
		VALUES ($3, $1, 'partner', $2, 'own', true)`,
		actorID, storeID, operatorContextID); err != nil {
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

	{
		actor := store.StoreActor{ID: actorID, Role: "partner", OperatorContextID: operatorContextID}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("partner scope verification failed: %v", err)
		}
		if !allowed {
			t.Fatal("partner in scope should be allowed")
		}
	}

	{
		actor := store.StoreActor{ID: "other-actor-no-scope", Role: "partner", OperatorContextID: operatorContextID}
		allowed, err := s.actorCanAccessMediaReference(ctx, actor, ref)
		if err != nil {
			t.Fatalf("partner out of scope verification failed: %v", err)
		}
		if allowed {
			t.Fatal("partner out of scope should be forbidden")
		}
	}
}

func TestHandleMediaDownloadEndpoint(t *testing.T) {
	mockAuthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")

		var identity auth.Identity
		switch authHeader {
		case "Bearer operator-token":
			identity = auth.Identity{Subject: "op-1", OperatorContextID: "OperatorContext-a", Roles: []string{"operator"}, AuthState: "authenticated", SessionSurface: "dsh-portal"}
		case "Bearer field-owner-token":
			identity = auth.Identity{Subject: "field-1", OperatorContextID: "OperatorContext-a", Roles: []string{"field"}, AuthState: "authenticated", SessionSurface: "app-field"}
		case "Bearer field-non-owner-token":
			identity = auth.Identity{Subject: "field-2", OperatorContextID: "OperatorContext-a", Roles: []string{"field"}, AuthState: "authenticated", SessionSurface: "app-field"}
		default:
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"message":"unauthenticated"}`))
			return
		}
		_ = json.NewEncoder(w).Encode(identity)
	}))
	defer mockAuthServer.Close()

	authClient := auth.NewClient(mockAuthServer.URL)

	{
		s := &protectedStoreServer{
			db:       nil,
			identity: authClient,
			media:    media.NewStaticProvider(&media.Client{}),
		}
		req := httptest.NewRequest(http.MethodGet, "/dsh/media", nil)
		req.Header.Set("Authorization", "Bearer field-owner-token")
		rec := httptest.NewRecorder()
		s.handleMediaDownload(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	}

	{
		s := &protectedStoreServer{
			db:       nil,
			identity: authClient,
			media:    nil,
		}
		req := httptest.NewRequest(http.MethodGet, "/dsh/media?mediaRef=some-ref", nil)
		req.Header.Set("Authorization", "Bearer field-owner-token")
		rec := httptest.NewRecorder()
		s.handleMediaDownload(rec, req)
		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	}
}

func TestHandleMediaDownloadEndpointDBIntegration(t *testing.T) {
	db := openTestDB(t)
	mockAuthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		var identity auth.Identity
		switch authHeader {
		case "Bearer partner-token":
			identity = auth.Identity{Subject: "partner-1", OperatorContextID: "local-dsh", Roles: []string{"partner"}, AuthState: "authenticated", SessionSurface: "app-partner"}
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
		media:    media.NewStaticProvider(&media.Client{}),
	}

	{
		req := httptest.NewRequest(http.MethodGet, "/dsh/media?mediaRef=totally-unknown-ref-123456", nil)
		req.Header.Set("Authorization", "Bearer partner-token")
		rec := httptest.NewRecorder()
		s.handleMediaDownload(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	}
}
