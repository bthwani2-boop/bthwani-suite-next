package store

import "strings"

type StorePublicationDiagnostics struct {
	IsReady  bool     `json:"isReady"`
	Blockers []string `json:"blockers"`
}

func DiagnoseStorePublication(row DshStoreRow) StorePublicationDiagnostics {
	blockers := make([]string, 0, 13)
	add := func(code, message string) {
		blockers = append(blockers, code+": "+message)
	}

	if row.Status != StatusActive {
		add("STORE_NOT_ACTIVE", "Store lifecycle must be active")
	}
	if !row.IsVisible {
		add("STORE_HIDDEN", "Store visibility must be enabled")
	}
	if row.ServiceabilityStatus != ServiceabilityServiceable && row.ServiceabilityStatus != ServiceabilityLimited {
		add("STORE_NOT_SERVICEABLE", "Store must be serviceable or limited")
	}
	if row.PartnerReadiness != "ready" {
		add("PARTNER_NOT_READY", "Partner readiness must be ready")
	}
	if row.CatalogApprovalStatus != "approved" {
		add("CATALOG_NOT_APPROVED", "Catalog must be approved")
	}
	if row.MarketingVisibility != "visible" {
		add("MARKETING_HIDDEN", "Marketing visibility must be visible")
	}
	if len(row.DeliveryModes) == 0 {
		add("DELIVERY_MODES_MISSING", "At least one delivery or pickup mode is required")
	}
	if strings.TrimSpace(row.AddressLine) == "" {
		add("ADDRESS_MISSING", "Store address is required")
	}
	if strings.TrimSpace(row.CoverageSummary) == "" {
		add("COVERAGE_MISSING", "Coverage summary is required")
	}
	if strings.TrimSpace(row.OperatingHours) == "" {
		add("OPERATING_HOURS_MISSING", "Operating hours are required")
	}
	if strings.TrimSpace(row.DeliveryReadiness) != "ready" {
		add("DELIVERY_NOT_READY", "Delivery readiness must be ready")
	}
	if row.LogoURL == nil || strings.TrimSpace(*row.LogoURL) == "" {
		add("STORE_LOGO_MISSING", "Approved store logo is required")
	}
	if row.HeroImageURL == nil || strings.TrimSpace(*row.HeroImageURL) == "" {
		add("STORE_COVER_MISSING", "Approved store cover image is required")
	}

	return StorePublicationDiagnostics{
		IsReady:  len(blockers) == 0,
		Blockers: blockers,
	}
}
