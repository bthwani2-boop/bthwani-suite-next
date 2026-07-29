package reference

import (
	"database/sql"
	"fmt"
	"strings"
)

// GetPaymentSessionByCheckoutIntentForOperatorContext resolves one checkout session only
// inside the authenticated OperatorContext. Cross-OperatorContext checkout identifiers are
// indistinguishable from missing records.
func GetPaymentSessionByCheckoutIntentForOperatorContext(db *sql.DB, operatorContextID, checkoutIntentID string) (*PaymentSession, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if operatorContextID == "" || checkoutIntentID == "" {
		return nil, fmt.Errorf("operatorContextId and checkoutIntentId are required")
	}
	return getPaymentSessionByCheckoutIntent(db, operatorContextID, checkoutIntentID)
}
