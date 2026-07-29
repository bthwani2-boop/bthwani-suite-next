package reference

import (
	"database/sql"
	"fmt"
	"strings"
)

// GetPaymentSessionByCheckoutIntentForTenant resolves one checkout session only
// inside the authenticated tenant. Cross-tenant checkout identifiers are
// indistinguishable from missing records.
func GetPaymentSessionByCheckoutIntentForTenant(db *sql.DB, operatorContextID, checkoutIntentID string) (*PaymentSession, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if operatorContextID == "" || checkoutIntentID == "" {
		return nil, fmt.Errorf("operatorContextId and checkoutIntentId are required")
	}
	return getPaymentSessionByCheckoutIntent(db, operatorContextID, checkoutIntentID)
}
