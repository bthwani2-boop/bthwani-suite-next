package reference

import (
	"database/sql"
	"fmt"
	"strings"
)

// GetPaymentSessionByCheckoutIntentForTenant resolves WLT-owned payment truth
// inside one trusted tenant. It is the only lookup suitable for downstream
// financial aggregates whose source identity may repeat in another tenant.
func GetPaymentSessionByCheckoutIntentForTenant(
	db *sql.DB,
	tenantID string,
	checkoutIntentID string,
) (*PaymentSession, error) {
	tenantID = strings.TrimSpace(tenantID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if tenantID == "" || checkoutIntentID == "" {
		return nil, fmt.Errorf("tenantId and checkoutIntentId are required")
	}
	return getPaymentSessionByCheckoutIntent(db, tenantID, checkoutIntentID)
}
