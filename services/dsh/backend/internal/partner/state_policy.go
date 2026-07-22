package partner

// PartnerStateView is a backward-compatible partner payload with the server-
// owned state policy flattened beside the existing Partner JSON fields.
type PartnerStateView struct {
	Partner
	AllowedActions     []string           `json:"allowedActions"`
	AllowedTransitions []ActivationStatus `json:"allowedTransitions"`
}

func AllowedTransitionsForStatus(status ActivationStatus) []ActivationStatus {
	transitions := allowedTransitions[status]
	return append([]ActivationStatus(nil), transitions...)
}

func AllowedTransitionsForSurface(status ActivationStatus, surface string) []ActivationStatus {
	all := AllowedTransitionsForStatus(status)
	switch surface {
	case "control-panel", "system":
		return all
	case "app-field":
		for _, target := range all {
			if target == StatusSubmitted {
				return []ActivationStatus{StatusSubmitted}
			}
		}
	}
	return []ActivationStatus{}
}

func AllowedActionsForSurface(status ActivationStatus, surface string) []string {
	actions := make([]string, 0, 12)
	switch surface {
	case "app-field":
		actions = append(actions, "read_owned_draft", "read_readiness")
		switch status {
		case StatusDraft, StatusFieldVisitScheduled, StatusDocumentsMissing, StatusOpsRejected:
			actions = append(actions,
				"update_owned_draft",
				"update_first_store",
				"upload_document",
				"capture_field_visit",
			)
		}
		if len(AllowedTransitionsForSurface(status, surface)) > 0 {
			actions = append(actions, "submit_for_review")
		}
	case "control-panel":
		actions = append(actions,
			"read_partner",
			"read_readiness",
			"read_documents",
			"read_field_visits",
			"read_audit",
			"link_unowned_store",
			"review_documents",
		)
		for _, transition := range AllowedTransitionsForSurface(status, surface) {
			actions = append(actions, operatorTransitionAction(transition))
		}
	case "app-partner":
		actions = append(actions, "read_own_status", "read_own_readiness")
		switch status {
		case StatusPartnerActive, StatusClientVisible, StatusClientHidden:
			actions = append(actions, "manage_authorized_store_team", "manage_store_settings")
		}
	case "app-client":
		if status == StatusClientVisible {
			actions = append(actions, "discover_store", "read_public_store")
		}
	case "system":
		actions = append(actions, "read_partner", "apply_governed_transition")
	}
	return compactActions(actions)
}

func BuildPartnerStateView(partner Partner, surface string) PartnerStateView {
	partner = SanitizePartnerForSurface(partner)
	return PartnerStateView{
		Partner:            partner,
		AllowedActions:     AllowedActionsForSurface(partner.ActivationStatus, surface),
		AllowedTransitions: AllowedTransitionsForSurface(partner.ActivationStatus, surface),
	}
}

func operatorTransitionAction(status ActivationStatus) string {
	switch status {
	case StatusSubmitted:
		return "return_to_submitted"
	case StatusFieldVisitScheduled:
		return "schedule_field_visit"
	case StatusFieldVisitCompleted:
		return "confirm_field_visit"
	case StatusDocumentsMissing:
		return "mark_documents_missing"
	case StatusDocumentsUploaded:
		return "mark_documents_uploaded"
	case StatusDocumentsVerified:
		return "verify_documents"
	case StatusCatalogNotReady:
		return "mark_catalog_not_ready"
	case StatusCatalogReady:
		return "mark_catalog_ready"
	case StatusDeliveryModesNotReady:
		return "mark_delivery_modes_not_ready"
	case StatusDeliveryModesReady:
		return "mark_delivery_modes_ready"
	case StatusOpsReview:
		return "start_ops_review"
	case StatusOpsApproved:
		return "approve_partner"
	case StatusOpsRejected:
		return "reject_partner"
	case StatusPartnerActive:
		return "activate_partner"
	case StatusPartnerDeactivated:
		return "deactivate_partner"
	case StatusClientVisible:
		return "publish_store"
	case StatusClientHidden:
		return "hide_store"
	default:
		return ""
	}
}

func compactActions(actions []string) []string {
	result := make([]string, 0, len(actions))
	seen := make(map[string]struct{}, len(actions))
	for _, action := range actions {
		if action == "" {
			continue
		}
		if _, exists := seen[action]; exists {
			continue
		}
		seen[action] = struct{}{}
		result = append(result, action)
	}
	return result
}
