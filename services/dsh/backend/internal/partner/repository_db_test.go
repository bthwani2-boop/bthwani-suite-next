package partner

import (
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

const partnerTestOperatorContextID = "local-dsh"

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

func createPartnerFixture(t *testing.T, db *sql.DB, prefix string) Partner {
	t.Helper()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	p, err := CreatePartnerForOperatorContext(db, partnerTestOperatorContextID, CreatePartnerInput{
		LegalNameAr:         "Ù…Ø¤Ø³Ø³Ø© Ø§Ø®ØªØ¨Ø§Ø± " + prefix + " " + suffix,
		LegalNameEn:         prefix + " Smoke " + suffix,
		DisplayName:         "Ø´Ø±ÙŠÙƒ Ø§Ø®ØªØ¨Ø§Ø± " + prefix + " " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "YE-" + prefix + "-" + suffix,
		OwnerActorID:        "partner-owner-" + suffix,
		PrimaryPhone:        "+96777" + suffix[len(suffix)-7:],
		Category:            "grocery",
		CreatedByActorID:    "field-local-001",
		CreatedBySurface:    "app-field",
	})
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func partnerStoreID(t *testing.T, db *sql.DB, partnerID string) string {
	t.Helper()
	var storeID string
	if err := db.QueryRow(`SELECT id FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at LIMIT 1`, partnerID).Scan(&storeID); err != nil {
		t.Fatalf("failed to resolve partner draft store: %v", err)
	}
	return storeID
}

func seedPartnerPublicationGates(t *testing.T, db *sql.DB, storeID string) {
	t.Helper()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	domainID := "domain-partner-lifecycle-" + suffix
	productID := "product-partner-lifecycle-" + suffix
	assortmentID := "assortment-partner-lifecycle-" + suffix

	if _, err := db.Exec(`
		INSERT INTO dsh_catalog_domains (id, slug, name_ar, is_active, is_client_visible)
		VALUES ($1, $1, 'نطاق اختبار دورة الشريك', TRUE, TRUE)`, domainID); err != nil {
		t.Fatalf("insert partner publication domain: %v", err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_stores
		SET status = 'published',
		    is_visible = TRUE,
		    serviceability_status = 'serviceable',
		    partner_readiness = 'ready',
		    catalog_approval_status = 'approved',
		    marketing_visibility = 'visible',
		    delivery_modes = ARRAY['delivery']::TEXT[],
		    address_line = 'صنعاء',
		    coverage_summary = 'نطاق صنعاء',
		    operating_hours = '08:00-22:00',
		    delivery_readiness = 'ready',
		    hero_image_url = 'https://media.example/partner-lifecycle-cover.webp',
		    logo_url = 'https://media.example/partner-lifecycle-logo.webp',
		    catalog_domain_id = $2,
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1`, storeID, domainID); err != nil {
		t.Fatalf("seed partner publication store gates: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_store_catalog_domains
			(store_id, domain_id, status, approved_by, approved_at)
		VALUES ($1, $2, 'approved', 'operator-local-001', NOW())`, storeID, domainID); err != nil {
		t.Fatalf("approve partner publication domain: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_master_products
			(id, domain_id, canonical_name_ar, approval_status, is_active)
		VALUES ($1, $2, 'منتج اختبار دورة الشريك', 'approved', TRUE)`, productID, domainID); err != nil {
		t.Fatalf("insert partner publication product: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_store_assortments
			(id, store_id, master_product_id, unit_price, currency, available,
			 stock_status, publication_status, approved_by)
		VALUES ($1, $2, $3, 100, 'YER', TRUE, 'in_stock', 'client_visible', 'operator-local-001')`,
		assortmentID, storeID, productID); err != nil {
		t.Fatalf("insert partner publication assortment: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_store_assortments WHERE id = $1`, assortmentID)
		_, _ = db.Exec(`DELETE FROM dsh_store_catalog_domains WHERE store_id = $1 AND domain_id = $2`, storeID, domainID)
		_, _ = db.Exec(`DELETE FROM dsh_master_products WHERE id = $1`, productID)
		_, _ = db.Exec(`DELETE FROM dsh_catalog_domains WHERE id = $1`, domainID)
	})
}

func seedPartnerDocumentMedia(t *testing.T, db *sql.DB, partnerID, actorID, mediaRef string) {
	t.Helper()
	if _, err := db.Exec(`
		INSERT INTO dsh_media_refs
			(media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id, purpose, content_type, original_filename)
		VALUES ($1, $2, $3, 'field', $4, 'partner_document', 'application/pdf', 'document.pdf')`,
		mediaRef, mediaRef+"-storage", actorID, partnerID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef) })
}

func cleanupPartnerLifecycleFixture(t *testing.T, db *sql.DB, partnerID, storeID string) {
	t.Helper()
	t.Cleanup(func() {
		cleanup := []struct {
			name  string
			query string
			args  []any
		}{
			{"field visits", `DELETE FROM dsh_partner_field_visits WHERE partner_id = $1`, []any{partnerID}},
			{"activation events", `DELETE FROM dsh_partner_activation_events WHERE partner_id = $1`, []any{partnerID}},
			{"store action audit", `DELETE FROM dsh_store_action_audit WHERE store_id = $1`, []any{storeID}},
			{"first store reference", `DELETE FROM dsh_partner_first_stores WHERE partner_id = $1 AND store_id = $2`, []any{partnerID, storeID}},
			{"store actor scopes", `DELETE FROM dsh_store_actor_scopes WHERE store_id = $1`, []any{storeID}},
			{"store", `DELETE FROM dsh_stores WHERE id = $1`, []any{storeID}},
			{"partner", `DELETE FROM dsh_partners WHERE id = $1`, []any{partnerID}},
		}
		for _, item := range cleanup {
			if _, err := db.Exec(item.query, item.args...); err != nil {
				t.Errorf("clean partner lifecycle %s: %v", item.name, err)
			}
		}
	})
}

func TestPartnerLifecycleDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "IT")
	storeID := partnerStoreID(t, db, p.ID)
	cleanupPartnerLifecycleFixture(t, db, p.ID, storeID)

	stores, err := LinkPartnerStoreForOperatorContext(db, partnerTestOperatorContextID, p.ID, storeID, "operator-local-001")
	if err != nil {
		t.Fatal(err)
	}
	if len(stores) == 0 {
		t.Fatal("expected linked partner store")
	}
	assertStoreReadiness(t, db, storeID, "pending")

	chain := []ActivationStatus{
		StatusSubmitted,
		StatusDocumentsUploaded,
		StatusDocumentsVerified,
		StatusOpsReview,
		StatusOpsApproved,
		StatusPartnerActive,
		StatusClientVisible,
	}
	for _, next := range chain {
		if next == StatusClientVisible {
			seedPartnerPublicationGates(t, db, storeID)
		}
		p, _, err = TransitionStatus(db, p.ID, TransitionInput{
			ToStatus:     next,
			Reason:       "db integration lifecycle",
			ActorID:      "operator-local-001",
			ActorSurface: "control-panel",
		}, 0)
		if err != nil {
			t.Fatalf("transition to %s failed: %v", next, err)
		}
	}
	assertStoreReadiness(t, db, storeID, "ready")

	var surface string
	if err := db.QueryRow(`
		SELECT actor_surface
		FROM dsh_partner_activation_events
		WHERE partner_id = $1 AND operator_context_id = $2 AND to_status = 'client_visible'
		ORDER BY created_at DESC
		LIMIT 1`, p.ID, partnerTestOperatorContextID).Scan(&surface); err != nil {
		t.Fatal(err)
	}
	if surface != "control-panel" {
		t.Fatalf("actor_surface = %q, want control-panel", surface)
	}

	lat := 15.3229
	lon := 44.2075
	visit, err := CreateFieldVisit(db, CreateFieldVisitInput{
		PartnerID:         p.ID,
		StoreID:           storeID,
		VisitNotes:        "db integration visit",
		LocationLatitude:  &lat,
		LocationLongitude: &lon,
		FieldActorID:      "field-local-001",
	})
	if err != nil {
		t.Fatal(err)
	}
	if visit.LocationLatitude == nil || visit.LocationLongitude == nil {
		t.Fatal("expected both coordinates to persist")
	}
}

func TestCreateFieldVisitRejectsStoreNotOwnedByPartner(t *testing.T) {
	db := openRequiredDB(t)
	p1 := createPartnerFixture(t, db, "OWN-A")
	p2 := createPartnerFixture(t, db, "OWN-B")
	otherStoreID := partnerStoreID(t, db, p2.ID)

	_, err := CreateFieldVisit(db, CreateFieldVisitInput{
		PartnerID:    p1.ID,
		StoreID:      otherStoreID,
		VisitNotes:   "should be rejected",
		FieldActorID: "field-local-001",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for store not owned by partner, got %v", err)
	}
}

func TestFieldVisitMediaUsesCanonicalBoundRecordsAndDeduplicates(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "VISIT-MEDIA")
	storeID := partnerStoreID(t, db, p.ID)
	mediaRef := "media://visit-canonical-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	storePartnerMediaBound(t, db, p.ID, storeID, "field-local-001", mediaRef, "field_readiness_evidence", "image/jpeg")

	visit, err := CreateFieldVisit(db, CreateFieldVisitInput{
		PartnerID:         p.ID,
		StoreID:           storeID,
		VisitNotes:        "canonical visit media",
		FieldActorID:      "field-local-001",
		EvidenceMediaRefs: []string{mediaRef, mediaRef},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(visit.EvidenceMediaRefs) != 1 || visit.EvidenceMediaRefs[0] != mediaRef {
		t.Fatalf("visit media refs = %#v, want one canonical ref", visit.EvidenceMediaRefs)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partner_field_visit_media WHERE visit_id = $1`, visit.ID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("canonical visit media rows = %d, want 1", count)
	}
	listed, err := ListFieldVisits(db, p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(listed) == 0 || len(listed[0].EvidenceMediaRefs) != 1 || listed[0].EvidenceMediaRefs[0] != mediaRef {
		t.Fatalf("listed visit media = %#v, want canonical readback", listed)
	}
}

func storePartnerMediaBound(t *testing.T, db *sql.DB, partnerID, storeID, actorID, mediaRef, purpose, contentType string) {
	t.Helper()
	if _, err := db.Exec(`
		INSERT INTO dsh_media_refs
			(media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id, store_id, purpose, content_type, original_filename)
		VALUES ($1, $2, $3, 'field', $4, $5, $6, $7, 'evidence.bin')`,
		mediaRef, mediaRef+"-storage", actorID, partnerID, storeID, purpose, contentType); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef) })
}

func TestPartnerDocumentRejectsVisitEvidenceMedia(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "DOC-SCOPE")
	mediaRef := "media://visit-evidence-cannot-be-legal"
	storePartnerMedia(t, db, p.ID, "field-local-001", mediaRef, "field_readiness_evidence", "image/jpeg")
	if _, err := UploadDocument(db, p.ID, UploadDocumentInput{
		DocumentType:      "commercial_register",
		MediaRef:          mediaRef,
		UploadedByActorID: "field-local-001",
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected visit evidence to be rejected as a legal document, got %v", err)
	}
}

func storePartnerMedia(t *testing.T, db *sql.DB, partnerID, actorID, mediaRef, purpose, contentType string) {
	t.Helper()
	if _, err := db.Exec(`
		INSERT INTO dsh_media_refs
			(media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id, purpose, content_type, original_filename)
		VALUES ($1, $2, $3, 'field', $4, $5, $6, 'evidence.bin')`,
		mediaRef, mediaRef+"-storage", actorID, partnerID, purpose, contentType); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef) })
}

func TestReviewDocumentClearsStaleRejectionReasonAfterApproval(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "DOC-REVIEW")
	seedPartnerDocumentMedia(t, db, p.ID, "field-local-001", "media://partner-document-review")
	document, err := UploadDocument(db, p.ID, UploadDocumentInput{
		DocumentType:      "commercial_register",
		MediaRef:          "media://partner-document-review",
		UploadedByActorID: "field-local-001",
	})
	if err != nil {
		t.Fatal(err)
	}

	document, _, err = ReviewDocument(db, p.ID, document.ID, ReviewDocumentInput{
		Decision:          "rejected",
		Reason:            "document is unreadable",
		ReviewedByActorID: "operator-local-001",
		CorrelationID:     "partner-document-rejected",
	})
	if err != nil {
		t.Fatal(err)
	}
	if document.RejectionReason == "" {
		t.Fatal("expected rejection reason to be persisted")
	}

	document, _, err = ReviewDocument(db, p.ID, document.ID, ReviewDocumentInput{
		Decision:          "approved",
		ReviewedByActorID: "operator-local-001",
		CorrelationID:     "partner-document-approved",
	})
	if err != nil {
		t.Fatal(err)
	}
	if document.DocumentStatus != "approved" || document.RejectionReason != "" {
		t.Fatalf("approved document retained stale rejection state: status=%q reason=%q", document.DocumentStatus, document.RejectionReason)
	}
}

func TestDocumentReuploadPreservesReviewHistoryAndSupersedesRejectedVersion(t *testing.T) {
	db := openRequiredDB(t)
	p := createPartnerFixture(t, db, "DOC-REUPLOAD")
	oldRef := "media://document-old-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	seedPartnerDocumentMedia(t, db, p.ID, "field-local-001", oldRef)
	oldDocument, err := UploadDocument(db, p.ID, UploadDocumentInput{
		DocumentType:      "commercial_register",
		MediaRef:          oldRef,
		UploadedByActorID: "field-local-001",
	})
	if err != nil {
		t.Fatal(err)
	}
	oldDocument, _, err = ReviewDocument(db, p.ID, oldDocument.ID, ReviewDocumentInput{
		Decision:          "needs_resubmit",
		Reason:            "الصورة غير واضحة",
		ReviewedByActorID: "operator-local-001",
	})
	if err != nil {
		t.Fatal(err)
	}
	if oldDocument.ReviewStatus != "reupload_required" || oldDocument.LastReviewReason == "" {
		t.Fatalf("reupload state = %#v", oldDocument)
	}

	newRef := "media://document-new-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	seedPartnerDocumentMedia(t, db, p.ID, "field-local-001", newRef)
	newDocument, err := UploadDocument(db, p.ID, UploadDocumentInput{
		DocumentType:      "commercial_register",
		MediaRef:          newRef,
		UploadedByActorID: "field-local-001",
	})
	if err != nil {
		t.Fatal(err)
	}
	if newDocument.SupersedesDocumentID != oldDocument.ID || newDocument.ReviewStatus != "pending" {
		t.Fatalf("new document linkage = %#v", newDocument)
	}
}

func assertStoreReadiness(t *testing.T, db *sql.DB, storeID, want string) {
	t.Helper()
	var got string
	if err := db.QueryRow(`SELECT partner_readiness FROM dsh_stores WHERE id = $1 AND operator_context_id = $2`, storeID, partnerTestOperatorContextID).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("partner_readiness for %s = %q, want %q", storeID, got, want)
	}
}
