package partner

import "testing"

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

func TestIsTransitionAllowed_legalPaths(t *testing.T) {
	cases := []struct {
		from ActivationStatus
		to   ActivationStatus
	}{
		{StatusDraft, StatusSubmitted},
		{StatusDraft, StatusFieldVisitScheduled},
		{StatusSubmitted, StatusFieldVisitScheduled},
		{StatusSubmitted, StatusDocumentsMissing},
		{StatusSubmitted, StatusDocumentsUploaded},
		{StatusFieldVisitScheduled, StatusFieldVisitCompleted},
		{StatusFieldVisitCompleted, StatusDocumentsUploaded},
		{StatusDocumentsMissing, StatusDocumentsUploaded},
		{StatusDocumentsUploaded, StatusDocumentsVerified},
		{StatusDocumentsUploaded, StatusDocumentsMissing},
		{StatusDocumentsVerified, StatusOpsReview},
		{StatusCatalogNotReady, StatusCatalogReady},
		{StatusCatalogReady, StatusDeliveryModesReady},
		{StatusDeliveryModesReady, StatusOpsReview},
		{StatusOpsReview, StatusOpsApproved},
		{StatusOpsReview, StatusOpsRejected},
		{StatusOpsApproved, StatusPartnerActive},
		{StatusOpsRejected, StatusSubmitted},
		{StatusOpsRejected, StatusDocumentsMissing},
		{StatusPartnerActive, StatusClientVisible},
		{StatusPartnerActive, StatusClientHidden},
		{StatusPartnerActive, StatusPartnerDeactivated},
		{StatusClientVisible, StatusClientHidden},
		{StatusClientVisible, StatusPartnerDeactivated},
		{StatusClientHidden, StatusClientVisible},
		{StatusClientHidden, StatusPartnerDeactivated},
		{StatusPartnerDeactivated, StatusOpsReview},
		{StatusPartnerDeactivated, StatusSubmitted},
	}
	for _, c := range cases {
		if !IsTransitionAllowed(c.from, c.to) {
			t.Errorf("expected %s → %s to be allowed", c.from, c.to)
		}
	}
}

func TestIsTransitionAllowed_illegalPaths(t *testing.T) {
	cases := []struct {
		from ActivationStatus
		to   ActivationStatus
		desc string
	}{
		{StatusDraft, StatusPartnerActive, "field cannot activate directly"},
		{StatusDraft, StatusClientVisible, "field cannot set client_visible"},
		{StatusSubmitted, StatusPartnerActive, "cannot skip review stages"},
		{StatusDocumentsMissing, StatusClientVisible, "missing docs cannot jump to visible"},
		{StatusOpsRejected, StatusPartnerActive, "rejected cannot activate directly"},
		{StatusPartnerDeactivated, StatusClientVisible, "deactivated cannot jump to visible"},
		{StatusClientVisible, StatusDraft, "cannot go backwards to draft"},
		{StatusPartnerActive, StatusDocumentsMissing, "active cannot go back to missing docs"},
		{StatusDraft, StatusDraft, "same-status self-loop blocked"},
		{"unknown_status", StatusSubmitted, "unknown from-status blocked"},
	}
	for _, c := range cases {
		if IsTransitionAllowed(c.from, c.to) {
			t.Errorf("expected %s → %s to be forbidden (%s)", c.from, c.to, c.desc)
		}
	}
}

// ---------------------------------------------------------------------------
// IsClientVisible
// ---------------------------------------------------------------------------

func TestIsClientVisible(t *testing.T) {
	if !IsClientVisible(StatusClientVisible) {
		t.Fatal("client_visible must return true")
	}
	for _, s := range []ActivationStatus{
		StatusDraft, StatusSubmitted, StatusPartnerActive,
		StatusPartnerDeactivated, StatusClientHidden, StatusOpsApproved,
	} {
		if IsClientVisible(s) {
			t.Errorf("expected IsClientVisible(%s) = false", s)
		}
	}
}

// ---------------------------------------------------------------------------
// ComputeReadiness
// ---------------------------------------------------------------------------

func TestComputeReadiness_canActivate(t *testing.T) {
	p := Partner{ID: "prt_001", ActivationStatus: StatusOpsApproved}
	r := ComputeReadiness(p, 2, 1, true, true, true, true, true, true, true)
	if !r.CanActivate {
		t.Fatalf("expected CanActivate=true for ops_approved with docs+store, got blocked: %s", r.BlockedReason)
	}
	if r.BlockedReason != "" {
		t.Errorf("expected no blocked reason, got %q", r.BlockedReason)
	}
}

func TestComputeReadiness_blockedNoDocs(t *testing.T) {
	p := Partner{ID: "prt_002", ActivationStatus: StatusOpsApproved}
	r := ComputeReadiness(p, 0, 0, true, true, true, true, true, true, true)
	if r.CanActivate {
		t.Fatal("cannot activate without approved documents")
	}
	if r.BlockedReason == "" {
		t.Fatal("expected a blocked reason for missing documents")
	}
}

func TestComputeReadiness_blockedNoStore(t *testing.T) {
	p := Partner{ID: "prt_003", ActivationStatus: StatusOpsApproved}
	r := ComputeReadiness(p, 2, 1, false, false, false, false, false, false, false)
	if r.CanActivate {
		t.Fatal("cannot activate without a linked store")
	}
	if r.BlockedReason == "" {
		t.Fatal("expected a blocked reason for missing store")
	}
}

func TestComputeReadiness_blockedWrongStatus(t *testing.T) {
	p := Partner{ID: "prt_004", ActivationStatus: StatusDocumentsMissing}
	r := ComputeReadiness(p, 2, 1, true, true, true, true, true, true, true)
	if r.CanActivate {
		t.Fatal("cannot activate when status is documents_missing")
	}
}

func TestComputeReadiness_checklistStructure(t *testing.T) {
	p := Partner{ID: "prt_005", ActivationStatus: StatusOpsApproved}
	r := ComputeReadiness(p, 2, 2, true, true, true, true, true, true, true)
	if len(r.Checklist) == 0 {
		t.Fatal("checklist must not be empty")
	}
	foundDocs, foundStore, foundActivation := false, false, false
	for _, item := range r.Checklist {
		switch item.ID {
		case "documents":
			foundDocs = true
			if !item.Satisfied {
				t.Error("documents item should be satisfied")
			}
		case "linked_store":
			foundStore = true
			if !item.Satisfied {
				t.Error("store item should be satisfied")
			}
		case "ops_approved":
			foundActivation = true
		}
	}
	if !foundDocs || !foundStore || !foundActivation {
		t.Errorf("checklist missing required items: docs=%v store=%v activation=%v",
			foundDocs, foundStore, foundActivation)
	}
}

func TestComputeReadiness_partnerIDPropagated(t *testing.T) {
	p := Partner{ID: "prt_006", ActivationStatus: StatusDraft}
	r := ComputeReadiness(p, 0, 0, false, false, false, false, false, false, false)
	if r.PartnerID != "prt_006" {
		t.Errorf("expected PartnerID='prt_006', got %q", r.PartnerID)
	}
}

// ---------------------------------------------------------------------------
// CreatePartnerInput.Validate
// ---------------------------------------------------------------------------

func TestCreatePartnerInput_valid(t *testing.T) {
	input := CreatePartnerInput{
		LegalNameAr:         "شركة الاختبار",
		DisplayName:         "Test Partner",
		PrimaryPhone:        "+9671234567",
		LegalIdentityNumber: "CR-001",
	}
	if err := input.Validate(); err != nil {
		t.Fatalf("expected valid input, got error: %v", err)
	}
}

func TestCreatePartnerInput_missingLegalNameAr(t *testing.T) {
	input := CreatePartnerInput{
		DisplayName: "Test", PrimaryPhone: "+967", LegalIdentityNumber: "CR-001",
	}
	if err := input.Validate(); err == nil {
		t.Fatal("expected error for missing LegalNameAr")
	}
}

func TestCreatePartnerInput_missingDisplayName(t *testing.T) {
	input := CreatePartnerInput{
		LegalNameAr: "شركة", PrimaryPhone: "+967", LegalIdentityNumber: "CR-001",
	}
	if err := input.Validate(); err == nil {
		t.Fatal("expected error for missing DisplayName")
	}
}

func TestCreatePartnerInput_missingPhone(t *testing.T) {
	input := CreatePartnerInput{
		LegalNameAr: "شركة", DisplayName: "Test", LegalIdentityNumber: "CR-001",
	}
	if err := input.Validate(); err == nil {
		t.Fatal("expected error for missing PrimaryPhone")
	}
}

func TestCreatePartnerInput_missingIdentityNumber(t *testing.T) {
	input := CreatePartnerInput{
		LegalNameAr: "شركة", DisplayName: "Test", PrimaryPhone: "+967",
	}
	if err := input.Validate(); err == nil {
		t.Fatal("expected error for missing LegalIdentityNumber")
	}
}

// ---------------------------------------------------------------------------
// UploadDocumentInput.Validate
// ---------------------------------------------------------------------------

func TestUploadDocumentInput_valid(t *testing.T) {
	input := UploadDocumentInput{DocumentType: "national_id", MediaRef: "media/doc.jpg"}
	if err := input.Validate(); err != nil {
		t.Fatalf("expected valid, got: %v", err)
	}
}

func TestUploadDocumentInput_missingType(t *testing.T) {
	input := UploadDocumentInput{MediaRef: "media/doc.jpg"}
	if err := input.Validate(); err == nil {
		t.Fatal("expected error for missing DocumentType")
	}
}

func TestUploadDocumentInput_missingMediaRef(t *testing.T) {
	input := UploadDocumentInput{DocumentType: "national_id"}
	if err := input.Validate(); err == nil {
		t.Fatal("expected error for missing MediaRef")
	}
}

// ---------------------------------------------------------------------------
// ReviewDocumentInput.Validate
// ---------------------------------------------------------------------------

func TestReviewDocumentInput_validDecisions(t *testing.T) {
	cases := []ReviewDocumentInput{
		{Decision: "approved"},
		{Decision: "rejected", Reason: "document is unreadable"},
		{Decision: "needs_resubmit", Reason: "required page is missing"},
	}
	for _, input := range cases {
		if err := input.Validate(); err != nil {
			t.Errorf("expected valid decision %q, got: %v", input.Decision, err)
		}
	}
}

func TestReviewDocumentInput_requiresReasonForNegativeDecisions(t *testing.T) {
	for _, d := range []string{"rejected", "needs_resubmit"} {
		input := ReviewDocumentInput{Decision: d, Reason: "   "}
		if err := input.Validate(); err == nil {
			t.Errorf("expected reason to be required for decision %q", d)
		}
	}
}

func TestReviewDocumentInput_invalidDecision(t *testing.T) {
	for _, d := range []string{"", "maybe", "pending", "APPROVED"} {
		input := ReviewDocumentInput{Decision: d}
		if err := input.Validate(); err == nil {
			t.Errorf("expected error for invalid decision %q", d)
		}
	}
}

// ---------------------------------------------------------------------------
// Surface boundary: field cannot activate
// ---------------------------------------------------------------------------

func TestFieldSurfaceCannotActivate(t *testing.T) {
	// app-field can only submit; any direct jump to partner_active is illegal
	for _, fieldReachable := range []ActivationStatus{StatusDraft, StatusSubmitted, StatusFieldVisitScheduled} {
		if IsTransitionAllowed(fieldReachable, StatusPartnerActive) {
			t.Errorf("field surface status %s must not allow direct partner_active transition", fieldReachable)
		}
		if IsTransitionAllowed(fieldReachable, StatusClientVisible) {
			t.Errorf("field surface status %s must not allow client_visible transition", fieldReachable)
		}
	}
}

// ---------------------------------------------------------------------------
// Deactivation hides client
// ---------------------------------------------------------------------------

func TestDeactivationRemovesClientVisibility(t *testing.T) {
	if !IsTransitionAllowed(StatusClientVisible, StatusPartnerDeactivated) {
		t.Fatal("client_visible → partner_deactivated must be allowed for immediate hide")
	}
	if IsClientVisible(StatusPartnerDeactivated) {
		t.Fatal("deactivated partner must not be client_visible")
	}
}

func TestPartnerReadinessForActivationStatus(t *testing.T) {
	cases := []struct {
		status ActivationStatus
		want   string
		ok     bool
	}{
		{StatusClientVisible, "ready", true},
		{StatusClientHidden, "blocked", true},
		{StatusPartnerDeactivated, "blocked", true},
		{StatusPartnerActive, "", false},
	}

	for _, c := range cases {
		got, ok := partnerReadinessForActivationStatus(c.status)
		if ok != c.ok || got != c.want {
			t.Fatalf("partnerReadinessForActivationStatus(%s) = (%q, %v), want (%q, %v)", c.status, got, ok, c.want, c.ok)
		}
		if got == "not_ready" {
			t.Fatalf("partner_readiness must use DB-valid values only, got %q", got)
		}
	}
}

func TestCreateFieldVisitRejectsPartialCoordinates(t *testing.T) {
	lat := 15.3694
	_, err := CreateFieldVisit(nil, CreateFieldVisitInput{
		PartnerID:        "prt_001",
		FieldActorID:     "field_001",
		LocationLatitude: &lat,
	})
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for latitude without longitude, got %v", err)
	}

	lon := 44.191
	_, err = CreateFieldVisit(nil, CreateFieldVisitInput{
		PartnerID:         "prt_001",
		FieldActorID:      "field_001",
		LocationLongitude: &lon,
	})
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for longitude without latitude, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// Store publication gates (client_visible) — one case per gate
// ---------------------------------------------------------------------------

func TestComputeReadiness_storePublicationGates(t *testing.T) {
	type gateCase struct {
		name                  string
		status                ActivationStatus
		hasStore              bool
		storeActive           bool
		storeServiceable      bool
		storePartnerReadiness bool
		storeCatalog          bool
		storeMarketing        bool
		storeVisible          bool
		wantPublish           bool
	}
	cases := []gateCase{
		{name: "all gates pass", status: StatusPartnerActive, hasStore: true, storeActive: true, storeServiceable: true, storePartnerReadiness: true, storeCatalog: true, storeMarketing: true, storeVisible: true, wantPublish: true},
		{name: "cannot publish without store", status: StatusPartnerActive, hasStore: false, storeActive: true, storeServiceable: true, storePartnerReadiness: true, storeCatalog: true, storeMarketing: true, storeVisible: true, wantPublish: false},
		{name: "cannot publish inactive store", status: StatusPartnerActive, hasStore: true, storeActive: false, storeServiceable: true, storePartnerReadiness: true, storeCatalog: true, storeMarketing: true, storeVisible: true, wantPublish: false},
		{name: "cannot publish hidden store", status: StatusPartnerActive, hasStore: true, storeActive: true, storeServiceable: true, storePartnerReadiness: true, storeCatalog: true, storeMarketing: true, storeVisible: false, wantPublish: false},
		{name: "cannot publish unserviceable store", status: StatusPartnerActive, hasStore: true, storeActive: true, storeServiceable: false, storePartnerReadiness: true, storeCatalog: true, storeMarketing: true, storeVisible: true, wantPublish: false},
		{name: "cannot publish unapproved catalog", status: StatusPartnerActive, hasStore: true, storeActive: true, storeServiceable: true, storePartnerReadiness: true, storeCatalog: false, storeMarketing: true, storeVisible: true, wantPublish: false},
		{name: "cannot publish hidden marketing", status: StatusPartnerActive, hasStore: true, storeActive: true, storeServiceable: true, storePartnerReadiness: true, storeCatalog: true, storeMarketing: false, storeVisible: true, wantPublish: false},
		{name: "cannot publish before partner is active", status: StatusOpsApproved, hasStore: true, storeActive: true, storeServiceable: true, storePartnerReadiness: true, storeCatalog: true, storeMarketing: true, storeVisible: true, wantPublish: false},
		{name: "cannot publish when partner readiness not ready", status: StatusPartnerActive, hasStore: true, storeActive: true, storeServiceable: true, storePartnerReadiness: false, storeCatalog: true, storeMarketing: true, storeVisible: true, wantPublish: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := Partner{ID: "prt_gate", ActivationStatus: tc.status}
			r := ComputeReadiness(p, 2, 1, tc.hasStore, tc.storeActive, tc.storeServiceable, tc.storePartnerReadiness, tc.storeCatalog, tc.storeMarketing, tc.storeVisible)
			if r.CanPublishStoreToClient != tc.wantPublish {
				t.Fatalf("CanPublishStoreToClient=%v, want %v (blocked: %q)", r.CanPublishStoreToClient, tc.wantPublish, r.StorePublicationBlockedReason)
			}
			if !tc.wantPublish && r.StorePublicationBlockedReason == "" {
				t.Fatal("expected StorePublicationBlockedReason when publication is blocked")
			}
			if tc.wantPublish && r.StorePublicationBlockedReason != "" {
				t.Fatalf("expected no blocked reason, got %q", r.StorePublicationBlockedReason)
			}
		})
	}
}
