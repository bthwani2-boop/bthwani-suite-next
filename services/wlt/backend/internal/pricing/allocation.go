package pricing

import (
	"errors"
	"fmt"
)

// AllocationComponent names one part of what a pricing quote or payment session total is made
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

// AllocationLine is one component of a price allocation.
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
