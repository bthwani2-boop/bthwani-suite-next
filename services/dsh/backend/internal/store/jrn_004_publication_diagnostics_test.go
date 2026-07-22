package store

import (
	"strings"
	"testing"
)

func diagnosticReadyStoreRow() DshStoreRow {
	row := eligibleStoreRow()
	logo := "https://media.example/store/logo.webp"
	cover := "https://media.example/store/cover.webp"
	row.LogoURL = &logo
	row.HeroImageURL = &cover
	return row
}

func TestDiagnoseStorePublicationReadyOnlyWhenAllGatesPass(t *testing.T) {
	diagnostics := DiagnoseStorePublication(diagnosticReadyStoreRow())
	if !diagnostics.IsReady {
		t.Fatalf("expected ready diagnostics, blockers=%v", diagnostics.Blockers)
	}
	if len(diagnostics.Blockers) != 0 {
		t.Fatalf("expected no blockers, got %v", diagnostics.Blockers)
	}
}

func TestDiagnoseStorePublicationReportsEveryRequiredGate(t *testing.T) {
	row := diagnosticReadyStoreRow()
	row.Status = StatusInactive
	row.IsVisible = false
	row.ServiceabilityStatus = ServiceabilityOutOfArea
	row.PartnerReadiness = "blocked"
	row.CatalogApprovalStatus = "draft"
	row.MarketingVisibility = "hidden"
	row.DeliveryModes = nil
	row.AddressLine = ""
	row.CoverageSummary = ""
	row.OperatingHours = ""
	row.DeliveryReadiness = "blocked"
	row.LogoURL = nil
	row.HeroImageURL = nil

	diagnostics := DiagnoseStorePublication(row)
	if diagnostics.IsReady {
		t.Fatal("diagnostics must fail closed when governance requirements are missing")
	}

	expectedCodes := []string{
		"STORE_NOT_ACTIVE",
		"STORE_HIDDEN",
		"STORE_NOT_SERVICEABLE",
		"PARTNER_NOT_READY",
		"CATALOG_NOT_APPROVED",
		"MARKETING_HIDDEN",
		"DELIVERY_MODES_MISSING",
		"ADDRESS_MISSING",
		"COVERAGE_MISSING",
		"OPERATING_HOURS_MISSING",
		"DELIVERY_NOT_READY",
		"STORE_LOGO_MISSING",
		"STORE_COVER_MISSING",
	}
	joined := strings.Join(diagnostics.Blockers, "\n")
	for _, code := range expectedCodes {
		if !strings.Contains(joined, code+":") {
			t.Fatalf("expected blocker %s in %v", code, diagnostics.Blockers)
		}
	}
}
