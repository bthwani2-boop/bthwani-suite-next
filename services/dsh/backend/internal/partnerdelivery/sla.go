package partnerdelivery

import (
	"context"
	"database/sql"
	"time"

	"dsh-api/internal/platformpolicies"
)

// DeliverySLAState classifies how a partner_delivery task's current leg is
// tracking against its threshold. The state vocabulary is shared across DSH
// SLA projections; partner delivery owns its distinct leg vocabulary.
type DeliverySLAState = platformpolicies.SLAState

const (
	DeliverySLANotStarted = platformpolicies.SLANotStarted
	DeliverySLAOnTrack    = platformpolicies.SLAOnTrack
	DeliverySLADueSoon    = platformpolicies.SLADueSoon
	DeliverySLAOverdue    = platformpolicies.SLAOverdue
	DeliverySLAClosed     = platformpolicies.SLAClosed
)

// DeliverySLALeg names which handoff the task is currently in.
type DeliverySLALeg string

const (
	DeliveryLegNone           DeliverySLALeg = ""
	DeliveryLegAssignToPickup DeliverySLALeg = "assign_to_pickup"
	DeliveryLegPickupToDepart DeliverySLALeg = "pickup_to_depart"
	DeliveryLegDepartToArrive DeliverySLALeg = "depart_to_arrive"
	DeliveryLegArriveToProof  DeliverySLALeg = "arrive_to_proof"
)

// DeliverySLAThresholds is the partner-delivery projection of the governed
// operational SLA policy. It contains no default values.
type DeliverySLAThresholds struct {
	AssignToPickup time.Duration
	PickupToDepart time.Duration
	DepartToArrive time.Duration
	ArriveToProof  time.Duration
	WarningBefore  time.Duration
}

func GetSLAThresholds(ctx context.Context, db *sql.DB, storeID string) (DeliverySLAThresholds, error) {
	policy, err := platformpolicies.GetOperationalSLAForStore(ctx, db, storeID, "default")
	if err != nil {
		return DeliverySLAThresholds{}, err
	}
	return DeliverySLAThresholds{
		AssignToPickup: time.Duration(policy.DeliveryAssignToPickupMins) * time.Minute,
		PickupToDepart: time.Duration(policy.DeliveryPickupToDepartMins) * time.Minute,
		DepartToArrive: time.Duration(policy.DeliveryDepartToArriveMins) * time.Minute,
		ArriveToProof:  time.Duration(policy.DeliveryArriveToProofMins) * time.Minute,
		WarningBefore:  time.Duration(policy.WarningBeforeMins) * time.Minute,
	}, nil
}

// DeliverySLA is the volatile, computed-on-read SLA projection for a task.
type DeliverySLA struct {
	State            DeliverySLAState `json:"state"`
	CurrentLeg       DeliverySLALeg   `json:"currentLeg"`
	LegStartedAt     *time.Time       `json:"legStartedAt"`
	LegDeadline      *time.Time       `json:"legDeadline"`
	RemainingSeconds int64            `json:"remainingSeconds"`
}

// EvaluateDeliverySLA derives the current leg and its SLA state from a
// partner_delivery task's timestamps. It performs no I/O and mutates
// nothing -- callers embed the result in read responses.
func EvaluateDeliverySLA(task *PartnerDeliveryTask, thresholds DeliverySLAThresholds, now time.Time) DeliverySLA {
	if task == nil {
		return DeliverySLA{State: DeliverySLANotStarted}
	}
	switch task.Status {
	case StatusCompleted, StatusCancelled, StatusException:
		return DeliverySLA{State: DeliverySLAClosed}
	case StatusUnassigned:
		return DeliverySLA{State: DeliverySLANotStarted}
	}

	var start *time.Time
	var leg DeliverySLALeg
	var budget time.Duration
	switch task.Status {
	case StatusAssigned:
		if task.PickedUpAt != nil {
			start, leg, budget = task.PickedUpAt, DeliveryLegPickupToDepart, thresholds.PickupToDepart
		} else {
			start, leg, budget = task.AssignedAt, DeliveryLegAssignToPickup, thresholds.AssignToPickup
		}
	case StatusDeparted:
		start, leg, budget = task.DepartedAt, DeliveryLegDepartToArrive, thresholds.DepartToArrive
	case StatusArrived, StatusProofPending:
		start, leg, budget = task.ArrivedAt, DeliveryLegArriveToProof, thresholds.ArriveToProof
	}
	if start == nil {
		return DeliverySLA{State: DeliverySLANotStarted, CurrentLeg: leg}
	}

	deadline := start.Add(budget)
	remaining := deadline.Sub(now)
	sla := DeliverySLA{
		CurrentLeg:       leg,
		LegStartedAt:     start,
		LegDeadline:      &deadline,
		RemainingSeconds: int64(remaining.Seconds()),
	}
	switch {
	case remaining <= 0:
		sla.State = DeliverySLAOverdue
	case remaining <= thresholds.WarningBefore:
		sla.State = DeliverySLADueSoon
	default:
		sla.State = DeliverySLAOnTrack
	}
	return sla
}
