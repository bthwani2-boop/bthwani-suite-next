package payment

import (
	"errors"
	"fmt"
)

// FinancialPurpose is the accounting meaning of a money movement: not which
// rail carried it (that is payment_method) but why the value moved, which is
// what decides where it lands in the ledger.
//
// A purpose is always derived by the server from facts it already trusts. It
// is never read off a request body, because a caller able to choose its own
// purpose would be able to choose its own accounting destination.
//
// This is the one definition of the vocabulary. Individual persistence sites
// constrain themselves to the subset they can legitimately hold -- a payment
// session can only carry a purpose derivable from a payment source, while
// OpeningBalance and FinancialCorrection describe ledger movements that have
// no payment session at all.
type FinancialPurpose string

const (
	PurposeOrderPayment          FinancialPurpose = "order_payment"
	PurposeSpecialRequestPayment FinancialPurpose = "special_request_payment"
	PurposeSubscriptionPurchase  FinancialPurpose = "subscription_purchase"
	PurposeOpeningBalance        FinancialPurpose = "opening_balance"
	PurposeFinancialCorrection   FinancialPurpose = "financial_correction"
)

// ErrPurposeNotDerivable is returned when the trusted source identity does not
// resolve to exactly one purpose. It is deliberately an error rather than a
// fallback: a movement whose meaning cannot be established must not be
// persisted under a guessed one.
var ErrPurposeNotDerivable = errors.New("financial purpose is not derivable from the trusted payment source")

// SessionSource carries the mutually exclusive source identifiers a payment
// session may be created from. The database enforces the same exclusivity
// (wlt-023, wlt-030); this mirrors it at the domain edge so a bad combination
// is rejected before any write is attempted.
type SessionSource struct {
	CheckoutIntentID       string
	SpecialRequestID       string
	SubscriptionPurchaseID string
}

// DerivePaymentSessionPurpose maps a trusted payment source to its accounting
// purpose. Exactly one identifier must be present; zero or several means the
// caller's intent is ambiguous and the session must not be created.
func DerivePaymentSessionPurpose(source SessionSource) (FinancialPurpose, error) {
	present := 0
	var purpose FinancialPurpose

	if source.CheckoutIntentID != "" {
		present++
		purpose = PurposeOrderPayment
	}
	if source.SpecialRequestID != "" {
		present++
		purpose = PurposeSpecialRequestPayment
	}
	if source.SubscriptionPurchaseID != "" {
		present++
		purpose = PurposeSubscriptionPurchase
	}

	if present != 1 {
		return "", fmt.Errorf("%w: exactly one payment source identifier must be present, found %d", ErrPurposeNotDerivable, present)
	}
	return purpose, nil
}

// AllocationComponent names one part of what a payment session total is made
// of. The set is closed: an unrecognised component is rejected rather than
// tolerated, so no caller can invent an accounting bucket.
type AllocationComponent string

const (
	AllocationGoodsSubtotal AllocationComponent = "goods_subtotal"
	AllocationDeliveryFee   AllocationComponent = "delivery_fee"
	AllocationServiceFee    AllocationComponent = "service_fee"
	AllocationTax           AllocationComponent = "tax"
	AllocationDiscount      AllocationComponent = "discount"
	AllocationTip           AllocationComponent = "tip"
)

var allocationComponents = map[AllocationComponent]struct{}{
	AllocationGoodsSubtotal: {},
	AllocationDeliveryFee:   {},
	AllocationServiceFee:    {},
	AllocationTax:           {},
	AllocationDiscount:      {},
	AllocationTip:           {},
}

// AllocationLine is one component of a payment allocation. The caller (DSH)
// owns the order's price breakdown and therefore supplies the amounts; WLT
// owns what those amounts mean financially and where they post.
type AllocationLine struct {
	Component        AllocationComponent `json:"component"`
	AmountMinorUnits int64               `json:"amountMinorUnits"`
}

// maxAllocationComponentMinorUnits bounds a single component well below the
// int64 ceiling so that summing the closed component set cannot overflow.
const maxAllocationComponentMinorUnits int64 = 1_000_000_000_000_000

var (
	ErrAllocationComponentUnknown  = errors.New("payment allocation component is not a recognised accounting component")
	ErrAllocationComponentRepeated = errors.New("payment allocation component is repeated")
	ErrAllocationComponentSign     = errors.New("payment allocation component has an invalid sign")
	ErrAllocationComponentRange    = errors.New("payment allocation component is out of the supported range")
	ErrAllocationNotConserved      = errors.New("payment allocation does not conserve the governed session total")
)

// ValidatePaymentAllocation proves the three properties the ledger depends on
// before any component is written:
//
//   - every component is a recognised accounting bucket;
//   - no component appears twice, which is what stops the delivery fee being
//     counted once as delivery and again as something else;
//   - the components sum to exactly the governed session total, so allocating
//     a payment can neither create nor destroy value.
//
// An empty allocation is valid and means "not broken down": callers that do
// not yet send a breakdown keep working unchanged. A partial breakdown is not
// valid, because a set that does not conserve the total is worse than none.
func ValidatePaymentAllocation(lines []AllocationLine, totalMinorUnits int64) error {
	if len(lines) == 0 {
		return nil
	}

	seen := make(map[AllocationComponent]struct{}, len(lines))
	var allocated int64

	for _, line := range lines {
		if _, ok := allocationComponents[line.Component]; !ok {
			return fmt.Errorf("%w: %q", ErrAllocationComponentUnknown, string(line.Component))
		}
		if _, duplicate := seen[line.Component]; duplicate {
			return fmt.Errorf("%w: %s", ErrAllocationComponentRepeated, line.Component)
		}
		seen[line.Component] = struct{}{}

		if line.AmountMinorUnits > maxAllocationComponentMinorUnits ||
			line.AmountMinorUnits < -maxAllocationComponentMinorUnits {
			return fmt.Errorf("%w: %s is %d", ErrAllocationComponentRange, line.Component, line.AmountMinorUnits)
		}

		// A discount reduces what the payer owes; every other component adds
		// to it. Mixing those signs up would let a "discount" inflate a total.
		if line.Component == AllocationDiscount {
			if line.AmountMinorUnits > 0 {
				return fmt.Errorf("%w: %s must not be positive, got %d", ErrAllocationComponentSign, line.Component, line.AmountMinorUnits)
			}
		} else if line.AmountMinorUnits < 0 {
			return fmt.Errorf("%w: %s must not be negative, got %d", ErrAllocationComponentSign, line.Component, line.AmountMinorUnits)
		}

		allocated += line.AmountMinorUnits
	}

	if allocated != totalMinorUnits {
		return fmt.Errorf("%w: components sum to %d but the governed total is %d", ErrAllocationNotConserved, allocated, totalMinorUnits)
	}
	return nil
}
