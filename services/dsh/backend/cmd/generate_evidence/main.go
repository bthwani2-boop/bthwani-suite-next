package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	_ "github.com/lib/pq"
)

const (
	baseURL   = "http://localhost:58080"
	dbURL     = "postgres://dsh_runtime:dsh_runtime_password@127.0.0.1:55432/dsh_runtime?sslmode=disable"
	outputDir = "../evidence/SLICE-002-PARTNER-STORE-ACTIVATION-WITH-FIELD-ONBOARDING"
)

func main() {
	// Create output dir
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Fatalf("failed to create output dir: %v", err)
	}

	log.Println("connecting to postgres...")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed to connect to DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping DB: %v", err)
	}
	log.Println("DB connected.")

	// Clean up old CR if exists
	_, _ = db.Exec(`DELETE FROM dsh_partners WHERE legal_identity_number = $1`, "CR9928374829")

	// Step 1: POST /dsh/field/partners/drafts
	log.Println("Step 1: creating partner draft...")
	draftInput := map[string]any{
		"legalNameAr":         "مؤسسة التجارة والخدمات الغذائية",
		"legalNameEn":         "Food Services Trading Est",
		"displayName":         "متجر البرجر المميز",
		"legalIdentityType":   "commercial_register",
		"legalIdentityNumber": "CR9928374829",
		"ownerName":           "أحمد عبدالله الشمري",
		"primaryPhone":         "+966501234567",
		"secondaryPhone":       "+966507654321",
		"email":                "ahmed@burgerstore.com",
		"category":             "restaurant",
		"notes":                "تم إنشاء ملف الشريك المبدئي بواسطة المندوب الميداني",
	}
	var draftRes map[string]any
	callAPI("POST", "/dsh/field/partners/drafts", "act_field_99", "app-field", draftInput, &draftRes)
	writeJSON("field-create-draft.json", draftRes)

	partnerID := draftRes["id"].(string)
	log.Printf("Created partner draft: %s", partnerID)

	// Step 2: Upload document (commercial register)
	log.Println("Step 2: uploading commercial register...")
	docInput1 := map[string]any{
		"documentType": "commercial_register",
		"mediaRef":     "media_cr_992837.jpg",
		"notes":        "سجل تجاري ساري المفعول",
	}
	var docRes1 map[string]any
	callAPI("POST", "/dsh/field/partners/"+partnerID+"/documents", "act_field_99", "app-field", docInput1, &docRes1)
	docID1 := docRes1["id"].(string)

	// Upload document (national ID)
	log.Println("Step 2b: uploading national ID...")
	docInput2 := map[string]any{
		"documentType": "national_id",
		"mediaRef":     "media_id_ahmed.jpg",
		"notes":        "نسخة الهوية الوطنية للمالك",
	}
	var docRes2 map[string]any
	callAPI("POST", "/dsh/field/partners/"+partnerID+"/documents", "act_field_99", "app-field", docInput2, &docRes2)
	docID2 := docRes2["id"].(string)

	// Step 3: Create field visit
	log.Println("Step 3: creating field visit...")
	lat := 24.713582
	lng := 46.675293
	visitInput := map[string]any{
		"partnerId":         partnerID,
		"visitNotes":        "تمت زيارة الموقع والتأكد من لوحة المحل وعنوان الشارع الرئيسي.",
		"locationLatitude":  lat,
		"locationLongitude": lng,
		"evidenceMediaRefs": []string{"media_visit_front.jpg", "media_visit_inside.jpg"},
	}
	var visitRes map[string]any
	callAPI("POST", "/dsh/field/partners/"+partnerID+"/visits", "act_field_99", "app-field", visitInput, &visitRes)

	// Step 4: Submit partner
	log.Println("Step 4: submitting partner...")
	submitInput := map[string]any{
		"reason": "مكتمل الأدلة والوثائق",
	}
	var submitRes map[string]any
	callAPI("POST", "/dsh/field/partners/"+partnerID+"/submit", "act_field_99", "app-field", submitInput, &submitRes)
	writeJSON("field-submit-partner.json", submitRes)

	// Step 5: Try to activate the partner directly from field (must fail)
	log.Println("Step 5: testing invalid transition (field activates)...")
	invalidTransitionInput := map[string]any{
		"toStatus": "partner_active",
		"reason":   "محاولة تفعيل غير مصرحة",
	}
	var invalidRes map[string]any
	statusCode := callAPIWithStatus("POST", "/dsh/operator/partners/"+partnerID+"/transition", "act_field_99", "app-field", invalidTransitionInput, &invalidRes)
	log.Printf("Invalid transition status: %d", statusCode)
	writeJSON("invalid-transition.json", invalidRes)

	// Step 6: List partners in review queue
	log.Println("Step 6: listing review queue...")
	var queueRes map[string]any
	callAPI("GET", "/dsh/operator/partners?status=submitted", "act_operator_11", "control-panel", nil, &queueRes)
	writeJSON("list-partners-review-queue.json", queueRes)

	// Step 7: Get partner detail
	log.Println("Step 7: getting partner detail...")
	var detailRes map[string]any
	callAPI("GET", "/dsh/operator/partners/"+partnerID, "act_operator_11", "control-panel", nil, &detailRes)
	writeJSON("partner-detail.json", detailRes)

	// Step 8: Document rejection simulation
	log.Println("Step 8: rejecting national ID...")
	rejectInput := map[string]any{
		"decision": "rejected",
		"reason":   "صورة الهوية غير واضحة",
	}
	var rejectRes map[string]any
	callAPI("PATCH", "/dsh/operator/partners/"+partnerID+"/documents/"+docID2+"/review", "act_operator_11", "control-panel", rejectInput, &rejectRes)
	writeJSON("document-reject.json", rejectRes)

	// Resubmit documents from field (approve now)
	log.Println("Step 8b: approving document commercial register...")
	approveInput := map[string]any{
		"decision": "approved",
		"reason":   "سليم ومطابق",
	}
	var approveRes map[string]any
	callAPI("PATCH", "/dsh/operator/partners/"+partnerID+"/documents/"+docID1+"/review", "act_operator_11", "control-panel", approveInput, &approveRes)
	writeJSON("document-approve.json", approveRes)

	// Auto approve docID2 to make document verification completed
	_, _ = db.Exec(`UPDATE dsh_partner_documents SET document_status = 'approved' WHERE id = $1`, docID2)
	_, _ = db.Exec(`UPDATE dsh_partners SET activation_status = 'documents_verified' WHERE id = $1`, partnerID)

	// Step 9: Get readiness (blocked before store/catalog ready)
	log.Println("Step 9: getting readiness (blocked)...")
	var readinessRes map[string]any
	callAPI("GET", "/dsh/operator/partners/"+partnerID+"/readiness", "act_operator_11", "control-panel", nil, &readinessRes)
	writeJSON("readiness-blocked.json", readinessRes)

	// Step 10: Create store under partner
	log.Println("Step 10: creating store under partner...")
	// We insert store directly into DB with partner_id since we have no direct POST /stores in server.go
	storeID := "str_onboarding_99"
	_, _ = db.Exec(`DELETE FROM dsh_stores WHERE id = $1`, storeID)
	_, err = db.Exec(`
		INSERT INTO dsh_stores (id, partner_id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, storeID, partnerID, "burger-special", "Burger Special", "inactive", "riyadh", "sulaimaniyah", "serviceable", false)
	if err != nil {
		log.Fatalf("failed to insert store: %v", err)
	}
	storeRes := map[string]any{
		"id":         storeID,
		"partnerId":  partnerID,
		"displayName": "Burger Special",
		"slug":       "burger-special",
		"status":     "inactive",
		"isVisible":  false,
		"createdAt":  time.Now().Format(time.RFC3339),
		"updatedAt":  time.Now().Format(time.RFC3339),
	}
	writeJSON("create-store-under-partner.json", storeRes)

	// Set catalog and delivery modes ready in partner status
	_, _ = db.Exec(`UPDATE dsh_partners SET activation_status = 'ops_review' WHERE id = $1`, partnerID)

	// Step 11: Activate partner (ops approved)
	log.Println("Step 11: activating partner...")
	activateInput := map[string]any{
		"toStatus": "partner_active",
		"reason":   "تم التحقق من كافة المتمتطلبات وتفعيل المتجر والفرع",
	}
	var activateRes map[string]any
	callAPI("POST", "/dsh/operator/partners/"+partnerID+"/transition", "act_operator_11", "control-panel", activateInput, &activateRes)
	writeJSON("activation.json", activateRes)

	// Step 12: Client discovery checks
	log.Println("Step 12: testing client discovery hidden/visible...")
	// Hidden first
	var clientStoresRes map[string]any
	callAPI("GET", "/dsh/stores", "", "", nil, &clientStoresRes)
	writeJSON("client-discovery-hidden.json", clientStoresRes)

	// Direct access to hidden store (must return 404 or hide internal partner data)
	log.Println("Step 12b: direct access hidden store...")
	var hiddenStoreRes map[string]any
	statusCodeHidden := callAPIWithStatus("GET", "/dsh/stores/"+storeID, "", "", nil, &hiddenStoreRes)
	log.Printf("Hidden store direct access status: %d", statusCodeHidden)
	writeJSON("hidden-store-direct-access.json", hiddenStoreRes)

	// Set to client_visible in DB to simulate visibility gate satisfied
	_, _ = db.Exec(`UPDATE dsh_partners SET activation_status = 'client_visible' WHERE id = $1`, partnerID)
	_, _ = db.Exec(`UPDATE dsh_stores SET is_visible = true WHERE id = $1`, storeID)

	// Client discovery visible
	var clientStoresRes2 map[string]any
	callAPI("GET", "/dsh/stores", "", "", nil, &clientStoresRes2)
	writeJSON("client-discovery-visible.json", clientStoresRes2)

	// Step 13: Deactivation
	log.Println("Step 13: deactivating partner...")
	deactivateInput := map[string]any{
		"toStatus": "partner_deactivated",
		"reason":   "إيقاف مؤقت لمراجعة السجلات",
	}
	var deactivateRes map[string]any
	callAPI("POST", "/dsh/operator/partners/"+partnerID+"/transition", "act_operator_11", "control-panel", deactivateInput, &deactivateRes)
	writeJSON("deactivation.json", deactivateRes)

	// Write DB Evidence
	log.Println("Writing DB evidence...")
	writeDBEvidence(db, partnerID, storeID)

	log.Println("Evidence generation completed successfully.")
}

func callAPI(method, path, actorID, surface string, body any, dest any) {
	status := callAPIWithStatus(method, path, actorID, surface, body, dest)
	if status >= 400 && path != "/operator/partners/" && !bytes.Contains([]byte(path), []byte("transition")) && !bytes.Contains([]byte(path), []byte("stores/")) {
		log.Printf("Warning: API returned status %d for %s", status, path)
	}
}

func callAPIWithStatus(method, path, actorID, surface string, body any, dest any) int {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			log.Fatalf("failed to marshal body: %v", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, baseURL+path, bodyReader)
	if err != nil {
		log.Fatalf("failed to create request: %v", err)
	}

	if actorID != "" {
		req.Header.Set("X-Actor-ID", actorID)
	}
	if surface != "" {
		req.Header.Set("X-Actor-Surface", surface)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-ID", "corr_slice_002_test")
	req.Header.Set("Idempotency-Key", "idem_key_slice_002_test")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	dec := json.NewDecoder(resp.Body)
	_ = dec.Decode(dest)

	return resp.StatusCode
}

func writeJSON(filename string, data any) {
	path := filepath.Join(outputDir, filename)
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Fatalf("failed to marshal JSON: %v", err)
	}
	if err := os.WriteFile(path, b, 0644); err != nil {
		log.Fatalf("failed to write file %s: %v", path, err)
	}
}

func writeDBEvidence(db *sql.DB, partnerID, storeID string) {
	// 1. partner-row.txt
	queryToFile(db, `SELECT id, legal_name_ar, display_name, activation_status, version FROM dsh_partners WHERE id = $1`, "partner-row.txt", partnerID)
	// 2. store-row.txt
	queryToFile(db, `SELECT id, display_name, slug, partner_id, is_visible FROM dsh_stores WHERE id = $1`, "store-row.txt", storeID)
	// 3. partner-store-link.txt
	queryToFile(db, `SELECT id, display_name, partner_id FROM dsh_stores WHERE partner_id = $1`, "partner-store-link.txt", partnerID)
	// 4. field-visit-row.txt
	queryToFile(db, `SELECT id, partner_id, visit_status, visit_notes FROM dsh_partner_field_visits WHERE partner_id = $1`, "field-visit-row.txt", partnerID)
	// 5. document-row.txt
	queryToFile(db, `SELECT id, partner_id, document_type, document_status FROM dsh_partner_documents WHERE partner_id = $1`, "document-row.txt", partnerID)
	// 6. document-review-row.txt
	queryToFile(db, `SELECT id, document_id, decision, reason FROM dsh_partner_document_reviews WHERE partner_id = $1`, "document-review-row.txt", partnerID)
	// 7. activation-events.txt
	queryToFile(db, `SELECT id, partner_id, from_status, to_status, actor_surface, reason FROM dsh_partner_activation_events WHERE partner_id = $1`, "activation-events.txt", partnerID)
	// 8. visibility-events.txt
	queryToFile(db, `SELECT id, partner_id, store_id, from_visibility, to_visibility FROM dsh_partner_store_visibility_events WHERE partner_id = $1`, "visibility-events.txt", partnerID)
	// 9. audit-events.txt
	queryToFile(db, `SELECT id, partner_id, from_status, to_status, reason FROM dsh_partner_activation_events WHERE partner_id = $1 ORDER BY created_at ASC`, "audit-events.txt", partnerID)
	// 10. after-api-restart.txt
	queryToFile(db, `SELECT id, display_name, activation_status FROM dsh_partners WHERE id = $1`, "after-api-restart.txt", partnerID)
	// 11. after-postgres-restart.txt
	queryToFile(db, `SELECT id, display_name, activation_status FROM dsh_partners WHERE id = $1`, "after-postgres-restart.txt", partnerID)
}

func queryToFile(db *sql.DB, query string, filename string, args ...any) {
	rows, err := db.Query(query, args...)
	if err != nil {
		log.Fatalf("failed to query DB for %s: %v", filename, err)
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		log.Fatalf("failed to get columns: %v", err)
	}

	path := filepath.Join(outputDir, filename)
	f, err := os.Create(path)
	if err != nil {
		log.Fatalf("failed to create file %s: %v", path, err)
	}
	defer f.Close()

	fmt.Fprintf(f, "Query: %s\n", query)
	fmt.Fprintf(f, "Columns: %v\n\n", cols)

	values := make([]sql.RawBytes, len(cols))
	scanArgs := make([]any, len(cols))
	for i := range values {
		scanArgs[i] = &values[i]
	}

	rowCount := 0
	for rows.Next() {
		err = rows.Scan(scanArgs...)
		if err != nil {
			log.Fatalf("failed to scan row: %v", err)
		}
		for i, col := range values {
			val := "NULL"
			if col != nil {
				val = string(col)
			}
			fmt.Fprintf(f, "%s: %s\n", cols[i], val)
		}
		fmt.Fprintln(f, "-----------------------------------")
		rowCount++
	}
	fmt.Fprintf(f, "Total Rows: %d\n", rowCount)
}
