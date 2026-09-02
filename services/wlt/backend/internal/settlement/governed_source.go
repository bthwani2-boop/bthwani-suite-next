package settlement

import (
	"errors"
	"fmt"
)

var ErrSettlementPolicyMissing = errors.New("active WLT settlement policy is required for this partner")
var ErrSettlementOrderAlreadyUsed = errors.New("one or more delivered orders were already included in another settlement")
var ErrSettlementAmountOverflow = errors.New("settlement amount exceeds supported integer range")

func addPositiveMinorUnits(total, value int64) (int64, error) {
	const maxInt64 = int64(1<<63 - 1)
	if value <= 0 || total < 0 || value > maxInt64-total {
		return 0, ErrSettlementAmountOverflow
	}
	return total + value, nil
}

func settlementFeeFromBasisPoints(grossAmount int64, feeBasisPoints int) (int64, error) {
	if grossAmount <= 0 || feeBasisPoints < 0 || feeBasisPoints > 10000 {
		return 0, fmt.Errorf("invalid settlement fee inputs")
	}
	basisPoints := int64(feeBasisPoints)
	whole := (grossAmount / 10000) * basisPoints
	remainder := ((grossAmount%10000)*basisPoints + 5000) / 10000
	fee := whole + remainder
	if fee < 0 || fee > grossAmount {
		return 0, ErrSettlementAmountOverflow
	}
	return fee, nil
}
