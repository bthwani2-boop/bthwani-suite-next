package payment

import (
	"testing"

	"wlt-api/internal/refund"
)

// TestRefundEconomicEffectExactlyInvertsCapture proves the refund journal is
// the exact mirror of the capture journal for every financial purpose: each
// capture line reappears in the refund with debit and credit swapped, the
// same amount, and the same wallet actor. This locks the two interpretations
// (payment.captureEconomicEffect and refund.RefundEconomicEffect) together so
// they can never drift apart and re-create the topup refund money bug where
// the wallet was never debited back.
func TestRefundEconomicEffectExactlyInvertsCapture(t *testing.T) {
	purposes := []FinancialPurpose{
		PurposeCustomerTopUp,
		PurposeCaptainTopUp,
		PurposeOrderPayment,
		PurposeSpecialRequestPayment,
		PurposeSubscriptionPurchase,
	}
	for _, purpose := range purposes {
		t.Run(string(purpose), func(t *testing.T) {
			session := &PaymentSession{
				ID:               "session-1",
				ClientID:         "client-1",
				AmountMinorUnits: 12500,
				Currency:         "YER",
				FinancialPurpose: string(purpose),
			}
			capture, err := captureEconomicEffect(session)
			if err != nil {
				t.Fatalf("captureEconomicEffect: %v", err)
			}
			reversal, err := refund.RefundEconomicEffect(refund.RefundSourceSession{
				FinancialPurpose: session.FinancialPurpose,
				ClientID:         session.ClientID,
				AmountMinorUnits: session.AmountMinorUnits,
				Currency:         session.Currency,
			})
			if err != nil {
				t.Fatalf("RefundEconomicEffect: %v", err)
			}
			if len(capture.Lines) != len(reversal) {
				t.Fatalf("refund must carry exactly as many lines as capture: capture=%d refund=%d", len(capture.Lines), len(reversal))
			}
			matched := map[int]bool{}
			for _, refundLine := range reversal {
				found := false
				for i, captureLine := range capture.Lines {
					if matched[i] {
						continue
					}
					if captureLine.AccountType != refundLine.AccountType ||
						captureLine.AmountMinorUnits != refundLine.AmountMinorUnits ||
						captureLine.Currency != refundLine.Currency ||
						captureLine.ActorType != refundLine.ActorType ||
						captureLine.ActorID != refundLine.ActorID {
						continue
					}
					if (captureLine.DebitCredit == "debit" && refundLine.DebitCredit != "credit") ||
						(captureLine.DebitCredit == "credit" && refundLine.DebitCredit != "debit") {
						continue
					}
					matched[i] = true
					found = true
					break
				}
				if !found {
					t.Fatalf("refund line %+v does not invert any capture line; capture=%+v refund=%+v", refundLine, capture.Lines, reversal)
				}
			}
		})
	}
}

func TestRefundEconomicEffectFailsClosedForUnknownPurpose(t *testing.T) {
	if _, err := refund.RefundEconomicEffect(refund.RefundSourceSession{
		FinancialPurpose: "opening_balance",
		ClientID:         "client-1",
		AmountMinorUnits: 100,
		Currency:         "YER",
	}); err == nil {
		t.Fatal("expected non-capture purpose to fail closed instead of posting a default journal")
	}
	if _, err := refund.RefundEconomicEffect(refund.RefundSourceSession{
		FinancialPurpose: string(PurposeCustomerTopUp),
		ClientID:         "client-1",
		AmountMinorUnits: 0,
		Currency:         "YER",
	}); err == nil {
		t.Fatal("expected zero amount to fail closed")
	}
}
