package store

import "strings"

type StorePublicationBlocker struct {
	Code    string `json:"code"`
	Field   string `json:"field"`
	Message string `json:"message"`
}

type StorePublicationDiagnostics struct {
	IsReady             bool                      `json:"isReady"`
	PublicationEligible bool                      `json:"publicationEligible"`
	Blockers            []StorePublicationBlocker `json:"blockers"`
}

func DiagnoseStorePublication(row DshStoreRow) StorePublicationDiagnostics {
	blockers := make([]StorePublicationBlocker, 0, 12)
	add := func(code, field, message string) {
		blockers = append(blockers, StorePublicationBlocker{Code: code, Field: field, Message: message})
	}

	if row.Status != StatusActive {
		add("STORE_NOT_ACTIVE", "status", "Store lifecycle must be active")
	}
	if !row.IsVisible {
		add("STORE_HIDDEN", "isVisible", "Store visibility must be enabled")
	}
	if row.ServiceabilityStatus != ServiceabilityServiceable && row.ServiceabilityStatus != ServiceabilityLimited {
		add("STORE_NOT_SERVICEABLE", "serviceability.status", "Store must be serviceable or limited")
	}
	if row.PartnerReadiness != "ready" {
		add("PARTNER_NOT_READY", "partnerReadiness", "Partner readiness must be ready")
	}
	if row.CatalogApprovalStatus != "approved" {
		add("CATALOG_NOT_APPROVED", "catalogApprovalStatus", "Catalog must be approved")
	}
	if row.MarketingVisibility != "visible" {
		add("MARKETING_HIDDEN", "marketingVisibility", "Marketing visibility must be visible")
	}
	if len(row.DeliveryModes) == 0 {
		add("DELIVERY_MODES_MISSING", "deliveryModes", "At least one delivery or pickup mode is required")
	}
	if strings.TrimSpace(row.AddressLine) == "" {
		add("ADDRESS_MISSING", "addressLine", "Store address is required")
	}
	if strings.TrimSpace(row.CoverageSummary) == "" {
		add("COVERAGE_MISSING", "coverageSummary", "Coverage summary is required")
	}
	if strings.TrimSpace(row.OperatingHours) == "" {
		add("OPERATING_HOURS_MISSING", "operatingHours", "Operating hours are required")
	}
	if strings.TrimSpace(row.DeliveryReadiness) != "ready" {
		add("DELIVERY_NOT_READY", "deliveryReadiness", "Delivery readiness must be ready")
	}
	if row.LogoURL == nil || strings.TrimSpace(*row.LogoURL) == "" {
		add("STORE_LOGO_MISSING", "logoUrl", "Approved store logo is required")
	}
	if row.HeroImageURL == nil || strings.TrimSpace(*row.HeroImageURL) == "" {
		add("STORE_COVER_MISSING", "heroImageUrl", "Approved store cover image is required")
	}

	return StorePublicationDiagnostics{
		IsReady:             len(blockers) == 0,
		PublicationEligible: IsPublicationEligible(row),
		Blockers:            blockers,
	}
}
