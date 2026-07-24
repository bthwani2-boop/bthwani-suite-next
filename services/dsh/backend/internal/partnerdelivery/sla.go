package partnerdelivery

import "time"

// DeliverySLAState classifies how a partner_delivery task's current leg is
// tracking against its threshold. Mirrors orders.PreparationSLAState.
type DeliverySLAState string

const (
	DeliverySLANotStarted DeliverySLAState = "not_started"
	DeliverySLAOnTrack    DeliverySLAState = "on_track"
	DeliverySLADueSoon    DeliverySLAState = "due_soon"
	DeliverySLAOverdue    DeliverySLAState = "overdue"
	DeliverySLAClosed     DeliverySLAState = "closed"
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

// DeliverySLAThresholds bounds how long each leg may run before it is
// flagged due_soon/overdue. Global constants for now; per-store tuning can
// follow orders.StorePreparationPolicy's pattern later if needed.
type DeliverySLAThresholds struct {
	AssignToPickup time.Duration
	PickupToDepart time.Duration
	DepartToArrive time.Duration
	ArriveToProof  time.Duration
	WarningBefore  time.Duration
}

func DefaultDeliverySLAThresholds() DeliverySLAThresholds {
	return DeliverySLAThresholds{
		AssignToPickup: 15 * time.Minute,
		PickupToDepart: 10 * time.Minute,
		DepartToArrive: 45 * time.Minute,
		ArriveToProof:  15 * time.Minute,
		WarningBefore:  5 * time.Minute,
	}
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
