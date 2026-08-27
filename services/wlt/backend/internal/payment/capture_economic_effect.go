package payment

import (
	"fmt"
	"strings"

	"wlt-api/internal/ledger"
)

// captureEconomicEffect is the single accounting interpretation of a captured
// payment session. Delivery channel (sync, webhook, inquiry, or reconciliation)
// never selects the journal; immutable FinancialPurpose does.
func captureEconomicEffect(session *PaymentSession) ([]ledger.LedgerLine, ledger.Actor, error) {
	if session == nil || session.AmountMinorUnits <= 0 || strings.TrimSpace(session.Currency) == "" {
		return nil, ledger.Actor{}, fmt.Errorf("captured session has invalid accounting amount or currency")
	}
	lines := []ledger.LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: session.AmountMinorUnits, Currency: session.Currency},
	}
	actor := ledger.Actor{ID: "wlt", Type: "service"}
	switch FinancialPurpose(session.FinancialPurpose) {
	case PurposeCustomerTopUp:
		lines = append(lines, ledger.LedgerLine{AccountType: "wallet", ActorType: "client", ActorID: session.ClientID, DebitCredit: "credit", AmountMinorUnits: session.AmountMinorUnits, Currency: session.Currency})
		actor = ledger.Actor{ID: session.ClientID, Type: "client"}
	case PurposeCaptainTopUp:
		lines = append(lines, ledger.LedgerLine{AccountType: "wallet", ActorType: "captain", ActorID: session.ClientID, DebitCredit: "credit", AmountMinorUnits: session.AmountMinorUnits, Currency: session.Currency})
		actor = ledger.Actor{ID: session.ClientID, Type: "captain"}
	case PurposeOrderPayment, PurposeSpecialRequestPayment, PurposeSubscriptionPurchase:
		lines = append(lines, ledger.LedgerLine{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: session.AmountMinorUnits, Currency: session.Currency})
	default:
		return nil, ledger.Actor{}, fmt.Errorf("financial purpose %q has no capture economic effect", session.FinancialPurpose)
	}
	return lines, actor, nil
}
