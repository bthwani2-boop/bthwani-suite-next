package reference

import (
	"database/sql"
	"fmt"
	"strings"
)

// GetPaymentSessionByCheckoutIntentForTenant resolves one checkout session only
// inside the authenticated tenant. Cross-tenant checkout identifiers are
// indistinguishable from missing records.
func GetPaymentSessionByCheckoutIntentForTenant(db *sql.DB, tenantID, checkoutIntentID string) (*PaymentSession, error) {
	tenantID = strings.TrimSpace(tenantID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if tenantID == "" || checkoutIntentID == "" {
		return nil, fmt.Errorf("tenantId and checkoutIntentId are required")
	}
	return getPaymentSessionByCheckoutIntent(db, tenantID, checkoutIntentID)
}
