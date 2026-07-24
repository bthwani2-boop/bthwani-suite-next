package pickup

import "time"

// SLAState classifies how a pickup session's current leg is tracking
// against its threshold. Mirrors orders.PreparationSLAState.
type SLAState string

const (
	SLANotStarted SLAState = "not_started"
	SLAOnTrack    SLAState = "on_track"
	SLADueSoon    SLAState = "due_soon"
	SLAOverdue    SLAState = "overdue"
	SLAClosed     SLAState = "closed"
)

// SLALeg names which handoff the session is currently in.
type SLALeg string

const (
	SLALegNone            SLALeg = ""
	SLALegAwaitingNotify  SLALeg = "awaiting_notify"
	SLALegAwaitingArrival SLALeg = "notified_to_arrival"
	SLALegAwaitingVerify  SLALeg = "arrived_to_verify"
)

// SLAThresholds bounds how long each pickup leg may run before it is
// flagged due_soon/overdue. Global constants for now.
type SLAThresholds struct {
	AwaitingNotify  time.Duration
	NotifyToArrival time.Duration
	ArrivalToVerify time.Duration
	WarningBefore   time.Duration
}

func DefaultSLAThresholds() SLAThresholds {
	return SLAThresholds{
		AwaitingNotify:  10 * time.Minute,
		NotifyToArrival: 60 * time.Minute,
		ArrivalToVerify: 10 * time.Minute,
		WarningBefore:   5 * time.Minute,
	}
}

// SLA is the volatile, computed-on-read SLA projection for a pickup session.
type SLA struct {
	State            SLAState   `json:"state"`
	CurrentLeg       SLALeg     `json:"currentLeg"`
	LegStartedAt     *time.Time `json:"legStartedAt"`
	LegDeadline      *time.Time `json:"legDeadline"`
	RemainingSeconds int64      `json:"remainingSeconds"`
}

// EvaluateSLA derives the current leg and its SLA state from a pickup
// session's timestamps. It performs no I/O and mutates nothing -- callers
// embed the result in read responses.
func EvaluateSLA(session *PickupSession, thresholds SLAThresholds, now time.Time) SLA {
	if session == nil {
		return SLA{State: SLANotStarted}
	}
	switch session.Status {
	case SessionVerified, SessionConsumed, SessionNoShow, SessionCancelled:
		return SLA{State: SLAClosed}
	}

	var start *time.Time
	var leg SLALeg
	var budget time.Duration
	switch {
	case session.CustomerArrivedAt != nil:
		start, leg, budget = session.CustomerArrivedAt, SLALegAwaitingVerify, thresholds.ArrivalToVerify
	case session.CustomerNotifiedAt != nil:
		start, leg, budget = session.CustomerNotifiedAt, SLALegAwaitingArrival, thresholds.NotifyToArrival
	default:
		start, leg, budget = &session.CreatedAt, SLALegAwaitingNotify, thresholds.AwaitingNotify
	}
	if start == nil {
		return SLA{State: SLANotStarted, CurrentLeg: leg}
	}

	deadline := start.Add(budget)
	remaining := deadline.Sub(now)
	sla := SLA{
		CurrentLeg:       leg,
		LegStartedAt:     start,
		LegDeadline:      &deadline,
		RemainingSeconds: int64(remaining.Seconds()),
	}
	switch {
	case remaining <= 0:
		sla.State = SLAOverdue
	case remaining <= thresholds.WarningBefore:
		sla.State = SLADueSoon
	default:
		sla.State = SLAOnTrack
	}
	return sla
}
