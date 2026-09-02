package payment

import (
	"errors"
	"fmt"

	"wlt-api/internal/pricing"
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
	// PurposeCustomerTopUp and PurposeCaptainTopUp are the two Cash-In
	// wallet-funding purposes (U002-T002): the actor tops up their own
	// wallet directly, with no order/subscription/special-request behind
	// the movement at all.
	PurposeCustomerTopUp FinancialPurpose = "customer_topup"
	PurposeCaptainTopUp  FinancialPurpose = "captain_topup"
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
	// TopUpReference is the fourth source identity (wlt-911): set only for a
	// Cash-In wallet top-up session. TopUpActorType must accompany it and
	// resolves which of the two top-up purposes applies.
	TopUpReference string
	TopUpActorType string
}

// ErrUnknownTopUpActorType is returned when TopUpReference is present but
// TopUpActorType is not one of the two actor types a wallet top-up may
// credit. Kept distinct from ErrPurposeNotDerivable so a caller can tell "no
// source" apart from "a top-up source with a corrupt/unsupported actor type".
var ErrUnknownTopUpActorType = errors.New("topup actor type is not recognised")

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
	if source.TopUpReference != "" {
		present++
		switch source.TopUpActorType {
		case "customer":
			purpose = PurposeCustomerTopUp
		case "captain":
			purpose = PurposeCaptainTopUp
		default:
			return "", fmt.Errorf("%w: %q", ErrUnknownTopUpActorType, source.TopUpActorType)
		}
	}

	if present != 1 {
		return "", fmt.Errorf("%w: exactly one payment source identifier must be present, found %d", ErrPurposeNotDerivable, present)
	}
	return purpose, nil
}

// AllocationComponent names one part of what a payment session total is made
// of. The canonical definition lives in the pricing package.
type AllocationComponent = pricing.AllocationComponent

const (
	AllocationGoodsSubtotal = pricing.AllocationGoodsSubtotal
	AllocationDeliveryFee   = pricing.AllocationDeliveryFee
	AllocationServiceFee    = pricing.AllocationServiceFee
	AllocationTax           = pricing.AllocationTax
	AllocationDiscount      = pricing.AllocationDiscount
	AllocationTip           = pricing.AllocationTip
)

// AllocationLine is one component of a payment allocation.
type AllocationLine = pricing.AllocationLine

var (
	ErrAllocationComponentUnknown  = pricing.ErrAllocationComponentUnknown
	ErrAllocationComponentRepeated = pricing.ErrAllocationComponentRepeated
	ErrAllocationComponentSign     = pricing.ErrAllocationComponentSign
	ErrAllocationComponentRange    = pricing.ErrAllocationComponentRange
	ErrAllocationNotConserved      = pricing.ErrAllocationNotConserved
)

// ValidatePaymentAllocation proves the allocation conservation properties before components are written.
func ValidatePaymentAllocation(lines []AllocationLine, totalMinorUnits int64) error {
	return pricing.ValidatePaymentAllocation(lines, totalMinorUnits)
}
