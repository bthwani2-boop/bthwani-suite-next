package refund

import (
        "fmt"
        "strings"

        "wlt-api/internal/ledger"
)

// RefundSourceSession carries the immutable facts of the payment session a
// refund reverses. The accounting meaning of the reversal is derived from the
// session's FinancialPurpose — the same fact captureEconomicEffect used when
// the money originally moved — so a refund always undoes exactly what the
// capture did. It must never guess a destination: an unknown purpose fails
// closed instead of posting to a default pair of accounts.
type RefundSourceSession struct {
        FinancialPurpose string
        ClientID         string
        AmountMinorUnits int64
        Currency         string
}

// RefundEconomicEffect is the single accounting interpretation of a
// completed refund. It is the exact mirror of payment.captureEconomicEffect:
// for wallet-funding purposes the wallet that capture credited is debited
// back, and for platform-collected purposes platform_payable is debited back
// while provider_clearing is credited with the money the provider returns.
// payment's capture-effect tests lock the inversion invariant across both
// interpretations, so the two can never drift apart.
func RefundEconomicEffect(source RefundSourceSession) ([]ledger.LedgerLine, error) {
        if source.AmountMinorUnits <= 0 || strings.TrimSpace(source.Currency) == "" {
                return nil, fmt.Errorf("refund source session has invalid accounting amount or currency")
        }
        switch source.FinancialPurpose {
        case "customer_topup":
                return []ledger.LedgerLine{
                        {AccountType: "wallet", ActorType: "client", ActorID: source.ClientID, DebitCredit: "debit", AmountMinorUnits: source.AmountMinorUnits, Currency: source.Currency},
                        {AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: source.AmountMinorUnits, Currency: source.Currency},
                }, nil
        case "captain_topup":
                return []ledger.LedgerLine{
                        {AccountType: "wallet", ActorType: "captain", ActorID: source.ClientID, DebitCredit: "debit", AmountMinorUnits: source.AmountMinorUnits, Currency: source.Currency},
                        {AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: source.AmountMinorUnits, Currency: source.Currency},
                }, nil
        case "order_payment", "special_request_payment", "subscription_purchase":
                return []ledger.LedgerLine{
                        {AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: source.AmountMinorUnits, Currency: source.Currency},
                        {AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: source.AmountMinorUnits, Currency: source.Currency},
                }, nil
        default:
                return nil, fmt.Errorf("financial purpose %q has no refund economic effect", source.FinancialPurpose)
        }
}
