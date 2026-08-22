package store

type StorePublicationDiagnostics struct {
	IsReady      bool     `json:"isReady"`
	Blockers     []string `json:"blockers"`
	BlockerCodes []string `json:"blockerCodes"`
}

func DiagnoseStorePublication(row DshStoreRow) StorePublicationDiagnostics {
	messages := map[string]string{
		"STORE_NOT_PUBLISHED":         "Store lifecycle must be published",
		"STORE_HIDDEN":                "Store visibility must be enabled",
		"STORE_NOT_SERVICEABLE":       "Store must be serviceable or limited",
		"PARTNER_NOT_READY":           "Partner readiness must be ready",
		"PARTNER_NOT_CLIENT_VISIBLE":  "Owning Partner must be client visible",
		"CATALOG_NOT_APPROVED":        "Catalog must be approved",
		"APPROVED_ASSORTMENT_MISSING": "At least one client-visible approved assortment is required",
		"MARKETING_HIDDEN":            "Marketing visibility must be visible",
		"DELIVERY_MODES_MISSING":      "At least one delivery or pickup mode is required",
		"ADDRESS_MISSING":             "Store address is required",
		"COVERAGE_MISSING":            "Coverage summary is required",
		"OPERATING_HOURS_MISSING":     "Operating hours are required",
		"DELIVERY_NOT_READY":          "Delivery readiness must be ready",
		"STORE_LOGO_MISSING":          "Approved store logo is required",
		"STORE_COVER_MISSING":         "Approved store cover image is required",
	}
	codes := append([]string(nil), row.BlockingReasonCodes...)
	blockers := make([]string, 0, len(codes))
	for _, code := range codes {
		message, ok := messages[code]
		if !ok {
			message = "Unknown canonical publication blocker"
		}
		blockers = append(blockers, code+": "+message)
	}
	ready := row.PublicationDecision == PublicationPublished && len(codes) == 0
	if row.PublicationDecision == "" {
		codes = append(codes, "CANONICAL_PUBLICATION_DECISION_MISSING")
		blockers = append(blockers, "CANONICAL_PUBLICATION_DECISION_MISSING: canonical publication view did not provide a decision")
		ready = false
	}
	return StorePublicationDiagnostics{IsReady: ready, Blockers: blockers, BlockerCodes: codes}
}
