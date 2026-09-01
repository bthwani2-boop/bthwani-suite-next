package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// GetOperationalSLAForStore resolves the store's service area to the sole
// governed operational zone and returns its persisted SLA policy. A missing
// or incomplete policy is an operational truth failure: consumers must not
// recreate a local duration fallback.
func GetOperationalSLAForStore(
	ctx context.Context,
	db *sql.DB,
	storeID string,
	category string,
) (OperationalSLA, error) {
	storeID = strings.TrimSpace(storeID)
	if db == nil || storeID == "" {
		return OperationalSLA{}, ErrInvalid
	}
	zoneID, _, err := resolveOperationalZoneForStore(ctx, db, storeID)
	if err != nil {
		return OperationalSLA{}, err
	}
	profile, err := GetOperationalProfile(ctx, db, zoneID, category)
	if err != nil {
		return OperationalSLA{}, err
	}
	if !profile.SLA.Configured {
		return OperationalSLA{}, ErrPolicyTruthUnavailable
	}
	if err := validateOperationalSLA(profile.SLA); err != nil {
		return OperationalSLA{}, err
	}
	return profile.SLA, nil
}

func validateOperationalSLA(sla OperationalSLA) error {
	if sla.RuleID == "" || sla.Version < 1 ||
		sla.WarningBeforeMins < 1 ||
		sla.PickupNotifyMins < 1 ||
		sla.PickupArrivalMins < 1 ||
		sla.PickupVerifyMins < 1 ||
		sla.DeliveryAssignToPickupMins < 1 ||
		sla.DeliveryPickupToDepartMins < 1 ||
		sla.DeliveryDepartToArriveMins < 1 ||
		sla.DeliveryArriveToProofMins < 1 {
		return fmt.Errorf("%w: incomplete SLA stage policy", ErrPolicyTruthUnavailable)
	}
	return nil
}

func IsOperationalSLAUnavailable(err error) bool {
	return errors.Is(err, ErrPolicyTruthUnavailable) || errors.Is(err, ErrNotFound)
}
