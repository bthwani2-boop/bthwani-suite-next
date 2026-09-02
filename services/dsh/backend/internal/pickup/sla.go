package pickup

import (
	"context"
	"database/sql"
	"time"

	"dsh-api/internal/platformpolicies"
)

// SLAState classifies how a pickup session's current leg is tracking
// against its threshold. The state vocabulary is shared across DSH SLA
// projections; pickup owns only its distinct leg vocabulary.
type SLAState = platformpolicies.SLAState

const (
	SLANotStarted = platformpolicies.SLANotStarted
	SLAOnTrack    = platformpolicies.SLAOnTrack
	SLADueSoon    = platformpolicies.SLADueSoon
	SLAOverdue    = platformpolicies.SLAOverdue
	SLAClosed     = platformpolicies.SLAClosed
)

// SLALeg names which handoff the session is currently in.
type SLALeg string

const (
	SLALegNone            SLALeg = ""
	SLALegAwaitingNotify  SLALeg = "awaiting_notify"
	SLALegAwaitingArrival SLALeg = "notified_to_arrival"
	SLALegAwaitingVerify  SLALeg = "arrived_to_verify"
)

// SLAThresholds is the pickup projection of the governed operational SLA
// policy. It contains no default values; callers must load it from policy.
type SLAThresholds struct {
	AwaitingNotify  time.Duration
	NotifyToArrival time.Duration
	ArrivalToVerify time.Duration
	WarningBefore   time.Duration
}

func GetSLAThresholds(ctx context.Context, db *sql.DB, storeID string) (SLAThresholds, error) {
	policy, err := platformpolicies.GetOperationalSLAForStore(ctx, db, storeID, "default")
	if err != nil {
		return SLAThresholds{}, err
	}
	return SLAThresholds{
		AwaitingNotify:  time.Duration(policy.PickupNotifyMins) * time.Minute,
		NotifyToArrival: time.Duration(policy.PickupArrivalMins) * time.Minute,
		ArrivalToVerify: time.Duration(policy.PickupVerifyMins) * time.Minute,
		WarningBefore:   time.Duration(policy.WarningBeforeMins) * time.Minute,
	}, nil
}

// SLA is the volatile, computed-on-read SLA projection for a pickup session.
type SLA struct {
	State            SLAState   `json:"state"`
	CurrentLeg       SLALeg     `json:"currentLeg"`
	LegStartedAt     *time.Time `json:"legStartedAt"`
	LegDeadline      *time.Time `json:"legDeadline"`
	RemainingSeconds int64      `json:"remainingSeconds"`
	IsPaused         bool       `json:"isPaused"`
	PausedUntil      *time.Time `json:"pausedUntil"`
}

// SLAAlert represents the detached alert state in dsh_sla_alerts
type SLAAlert struct {
	ID             string     `json:"id"`
	ReferenceType  string     `json:"referenceType"` // 'pickup_session'
	ReferenceID    string     `json:"referenceId"`
	StoreID        string     `json:"storeId"`
	AlertType      string     `json:"alertType"`
	State          string     `json:"state"` // 'active', 'acknowledged', 'resolved', 'paused'
	PauseReason    string     `json:"pauseReason"`
	PausedUntil    *time.Time `json:"pausedUntil"`
	AcknowledgedAt *time.Time `json:"acknowledgedAt"`
}

// EvaluateSLA derives the current leg and its SLA state from a pickup
// session's timestamps. If an active alert exists, it applies pause rules.
func EvaluateSLA(session *PickupSession, alert *SLAAlert, thresholds SLAThresholds, now time.Time) SLA {
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

	// Apply Pause Logic
	isPaused := false
	var pausedUntil *time.Time
	if alert != nil && alert.State == "paused" && alert.PausedUntil != nil && alert.PausedUntil.After(now) {
		isPaused = true
		pausedUntil = alert.PausedUntil
		// Extend deadline by the pause duration (simplified)
		deadline = deadline.Add(alert.PausedUntil.Sub(now))
	}

	remaining := deadline.Sub(now)
	sla := SLA{
		CurrentLeg:       leg,
		LegStartedAt:     start,
		LegDeadline:      &deadline,
		RemainingSeconds: int64(remaining.Seconds()),
		IsPaused:         isPaused,
		PausedUntil:      pausedUntil,
	}

	if isPaused {
		sla.State = SLAOnTrack // Avoid alerting while paused
		return sla
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
