package payment

import "encoding/json"

// PaymentSessionCapabilities is the server-owned behavioral projection for a
// payment-session status. Frontends may render this decision but must not
// re-derive terminality, retry safety, reconciliation requirements, or legal
// next actions from status strings.
type PaymentSessionCapabilities struct {
	Terminal               bool     `json:"terminal"`
	RetryAllowed           bool     `json:"retryAllowed"`
	ReconciliationRequired bool     `json:"reconciliationRequired"`
	OperationInProgress    bool     `json:"operationInProgress"`
	NextAllowedActions     []string `json:"nextAllowedActions"`
}

// CapabilitiesForStatus centralizes the behavioral meaning of every payment
// status owned by WLT. Unknown values fail closed: no retry, no action, and a
// reconciliation requirement so callers cannot invent unsafe behavior.
func CapabilitiesForStatus(status string) PaymentSessionCapabilities {
	switch status {
	case "reference_created", "pending_provider":
		return PaymentSessionCapabilities{
			RetryAllowed:       true,
			NextAllowedActions: []string{"authorize", "expire"},
		}
	case "authorization_pending":
		return PaymentSessionCapabilities{
			OperationInProgress: true,
			NextAllowedActions:  []string{"refresh_provider_status"},
		}
	case "authorized":
		return PaymentSessionCapabilities{
			RetryAllowed:       true,
			NextAllowedActions: []string{"capture", "expire"},
		}
	case "capture_pending":
		return PaymentSessionCapabilities{
			OperationInProgress: true,
			NextAllowedActions:  []string{"refresh_provider_status"},
		}
	case "captured", "cod_collected":
		return PaymentSessionCapabilities{
			Terminal:           true,
			NextAllowedActions: []string{},
		}
	case "cod_pending":
		return PaymentSessionCapabilities{
			NextAllowedActions: []string{"record_delivery_collection"},
		}
	case "failed", "expired":
		return PaymentSessionCapabilities{
			Terminal:           true,
			RetryAllowed:       true,
			NextAllowedActions: []string{"create_new_payment_session"},
		}
	case "provider_result_unknown":
		return PaymentSessionCapabilities{
			ReconciliationRequired: true,
			NextAllowedActions:     []string{"refresh_provider_status", "open_reconciliation"},
		}
	default:
		return PaymentSessionCapabilities{
			ReconciliationRequired: true,
			NextAllowedActions:     []string{},
		}
	}
}

// MarshalJSON appends the authoritative capabilities projection to every
// PaymentSession response without duplicating persisted columns or changing
// the database schema.
func (s PaymentSession) MarshalJSON() ([]byte, error) {
	type paymentSessionAlias PaymentSession
	return json.Marshal(struct {
		paymentSessionAlias
		Capabilities PaymentSessionCapabilities `json:"capabilities"`
	}{
		paymentSessionAlias: paymentSessionAlias(s),
		Capabilities:        CapabilitiesForStatus(s.Status),
	})
}
