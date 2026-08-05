package partner

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func createJ021Partner(t *testing.T, createdByActorID string) Partner {
	t.Helper()
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	p, err := CreatePartnerForOperatorContext(db, "operator-context-j021-"+suffix, CreatePartnerInput{
		LegalNameAr:         "Ø´Ø±ÙŠÙƒ Ù…Ø±Ø§Ø¬Ø¹Ø© " + suffix,
		LegalNameEn:         "J021 Review Partner " + suffix,
		DisplayName:         "J021 Partner " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "J021-CR-" + suffix,
		OwnerName:           "J021 Owner",
		PrimaryPhone:        "+9677" + suffix[len(suffix)-8:],
		Category:            "restaurant",
		CreatedByActorID:    createdByActorID,
		CreatedBySurface:    "app-field",
	})
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func requestWithPartnerActor(body string, partnerID, actorID string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/dsh/operator/partners/"+partnerID+"/transition", bytes.NewBufferString(body))
	req.SetPathValue("partnerId", partnerID)
	ctx := context.WithValue(req.Context(), "actor_id", actorID)
	ctx = context.WithValue(ctx, "actor_surface", "control-panel")
	return req.WithContext(ctx)
}

func responseCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()
	var payload struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode error response: %v; body=%s", err, recorder.Body.String())
	}
	return payload.Code
}

func TestPartnerCreatorCannotApproveOwnPartnerDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	creator := "field-j021-self-approval"
	p := createJ021Partner(t, creator)
	nextCalled := false
	handler := EnforcePartnerDecisionSeparation(db, func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	})
	recorder := httptest.NewRecorder()
	handler(recorder, requestWithPartnerActor(
		`{"toStatus":"ops_approved","reason":"independent operations approval"}`,
		p.ID,
		creator,
	))
	if recorder.Code != http.StatusForbidden || responseCode(t, recorder) != "SELF_APPROVAL_FORBIDDEN" {
		t.Fatalf("self approval response = %d/%s", recorder.Code, recorder.Body.String())
	}
	if nextCalled {
		t.Fatal("governed transition handler ran after self-approval rejection")
	}
}

func TestPartnerDecisionRequiresAuditReasonDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	p := createJ021Partner(t, "field-j021-reason-owner")
	nextCalled := false
	handler := EnforcePartnerDecisionSeparation(db, func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	})
	recorder := httptest.NewRecorder()
	handler(recorder, requestWithPartnerActor(
		`{"toStatus":"ops_approved","reason":"   "}`,
		p.ID,
		"operator-j021-independent",
	))
	if recorder.Code != http.StatusBadRequest || responseCode(t, recorder) != "DECISION_REASON_REQUIRED" {
		t.Fatalf("missing reason response = %d/%s", recorder.Code, recorder.Body.String())
	}
	if nextCalled {
		t.Fatal("governed transition handler ran without an audit reason")
	}
}

func TestEvidenceUploaderCannotReviewOwnDocumentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	uploader := "field-j021-document-uploader"
	p := createJ021Partner(t, uploader)
	doc, err := UploadDocument(db, p.ID, UploadDocumentInput{
		DocumentType:      "commercial_register",
		MediaRef:          "media-j021-self-review",
		Notes:             "review separation evidence",
		UploadedByActorID: uploader,
	})
	if err != nil {
		t.Fatal(err)
	}

	nextCalled := false
	handler := EnforcePartnerDocumentReviewSeparation(db, func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	})
	req := httptest.NewRequest(http.MethodPatch, "/review", strings.NewReader(`{"decision":"approved","reason":"evidence verified"}`))
	req.SetPathValue("partnerId", p.ID)
	req.SetPathValue("docId", doc.ID)
	req = req.WithContext(context.WithValue(req.Context(), "actor_id", uploader))
	recorder := httptest.NewRecorder()
	handler(recorder, req)
	if recorder.Code != http.StatusForbidden || responseCode(t, recorder) != "SELF_APPROVAL_FORBIDDEN" {
		t.Fatalf("self document review response = %d/%s", recorder.Code, recorder.Body.String())
	}
	if nextCalled {
		t.Fatal("document review mutation ran after self-review rejection")
	}
}

func TestConcurrentPartnerDecisionsRejectStaleVersionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	p := createJ021Partner(t, "field-j021-concurrent-owner")
	if _, err := db.Exec(`UPDATE dsh_partners SET activation_status = 'ops_review', version = 11 WHERE id = $1`, p.ID); err != nil {
		t.Fatal(err)
	}

	first, event, err := TransitionStatusGoverned(context.Background(), db, p.ID, TransitionInput{
		ToStatus:       StatusOpsApproved,
		Reason:         "first independent decision",
		ActorID:        "operator-j021-reviewer-a",
		ActorSurface:   "control-panel",
		IdempotencyKey: "j021-concurrent-a-" + p.ID,
	}, 11)
	if err != nil {
		t.Fatal(err)
	}
	if first.ActivationStatus != StatusOpsApproved || event.Reason != "first independent decision" {
		t.Fatalf("first decision/audit mismatch: status=%s reason=%q", first.ActivationStatus, event.Reason)
	}

	_, _, err = TransitionStatusGoverned(context.Background(), db, p.ID, TransitionInput{
		ToStatus:       StatusOpsRejected,
		Reason:         "stale competing decision",
		ActorID:        "operator-j021-reviewer-b",
		ActorSurface:   "control-panel",
		IdempotencyKey: "j021-concurrent-b-" + p.ID,
	}, 11)
	if !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("stale competing decision = %v, want ErrVersionConflict", err)
	}
}

func TestPartnerDeactivationBlocksActiveStoresAndAuditsReasonDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	p := createJ021Partner(t, "field-j021-suspension-owner")
	if _, err := db.Exec(`UPDATE dsh_partners SET activation_status = 'partner_active', version = 17 WHERE id = $1`, p.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		UPDATE dsh_stores
		SET status = 'published', is_visible = true, partner_readiness = 'ready'
		WHERE partner_id = $1`, p.ID); err != nil {
		t.Fatal(err)
	}

	updated, event, err := TransitionStatusGoverned(context.Background(), db, p.ID, TransitionInput{
		ToStatus:       StatusPartnerDeactivated,
		Reason:         "compliance suspension pending remediation",
		ActorID:        "operator-j021-suspension",
		ActorSurface:   "control-panel",
		IdempotencyKey: "j021-suspend-" + p.ID,
	}, 17)
	if err != nil {
		t.Fatal(err)
	}
	if updated.ActivationStatus != StatusPartnerDeactivated || event.Reason != "compliance suspension pending remediation" {
		t.Fatalf("deactivation/audit mismatch: status=%s reason=%q", updated.ActivationStatus, event.Reason)
	}
	var readiness string
	if err := db.QueryRow(`SELECT partner_readiness FROM dsh_stores WHERE partner_id = $1 ORDER BY created_at LIMIT 1`, p.ID).Scan(&readiness); err != nil {
		t.Fatal(err)
	}
	if readiness != "blocked" {
		t.Fatalf("active store readiness after partner suspension = %q, want blocked", readiness)
	}
}
