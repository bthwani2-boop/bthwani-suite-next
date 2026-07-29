package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

type ProviderAvailabilityProjectionInput struct {
	OperatorContextID         string    `json:"operatorContextId"`
	NoticeID         string    `json:"noticeId"`
	ActorType        string    `json:"actorType"`
	ActorID          string    `json:"actorId"`
	NoticeType       string    `json:"noticeType"`
	StartsAt         time.Time `json:"startsAt"`
	EndsAt           time.Time `json:"endsAt"`
	Status           string    `json:"status"`
	Reason           string    `json:"reason"`
	SourceUpdatedAt  time.Time `json:"sourceUpdatedAt"`
}

type ProviderAvailabilityProjection struct {
	ProviderAvailabilityProjectionInput
	SyncedAt time.Time `json:"syncedAt"`
}

func normalizeAvailabilityProjection(input *ProviderAvailabilityProjectionInput) error {
	input.OperatorContextID = normalizeOperatorContextID(input.OperatorContextID)
	input.NoticeID = strings.TrimSpace(input.NoticeID)
	input.ActorType = strings.ToLower(strings.TrimSpace(input.ActorType))
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.NoticeType = strings.TrimSpace(input.NoticeType)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Status == "" {
		input.Status = "active"
	}
	if input.SourceUpdatedAt.IsZero() {
		input.SourceUpdatedAt = time.Now().UTC()
	}
	if input.NoticeID == "" || input.ActorID == "" || input.NoticeType == "" ||
		(input.ActorType != "captain" && input.ActorType != "field") ||
		(input.Status != "active" && input.Status != "cancelled") ||
		input.StartsAt.IsZero() || input.EndsAt.IsZero() || !input.EndsAt.After(input.StartsAt) {
		return fmt.Errorf("%w: invalid provider availability projection", ErrInvalid)
	}
	return nil
}

func UpsertProviderAvailabilityProjection(ctx context.Context, db *sql.DB, input ProviderAvailabilityProjectionInput) (ProviderAvailabilityProjection, error) {
	if err := normalizeAvailabilityProjection(&input); err != nil {
		return ProviderAvailabilityProjection{}, err
	}
	var result ProviderAvailabilityProjection
	err := db.QueryRowContext(ctx, `INSERT INTO dsh_provider_availability_projections(
		operator_context_id,notice_id,actor_type,actor_id,notice_type,starts_at,ends_at,status,
		reason,source_updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT(operator_context_id,notice_id) DO UPDATE SET
			actor_type=EXCLUDED.actor_type,actor_id=EXCLUDED.actor_id,
			notice_type=EXCLUDED.notice_type,starts_at=EXCLUDED.starts_at,
			ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,reason=EXCLUDED.reason,
			source_updated_at=EXCLUDED.source_updated_at,synced_at=now()
		WHERE dsh_provider_availability_projections.source_updated_at <= EXCLUDED.source_updated_at
		RETURNING operator_context_id,notice_id,actor_type,actor_id,notice_type,starts_at,ends_at,
		status,reason,source_updated_at,synced_at`,
		input.OperatorContextID, input.NoticeID, input.ActorType, input.ActorID, input.NoticeType,
		input.StartsAt, input.EndsAt, input.Status, input.Reason, input.SourceUpdatedAt,
	).Scan(
		&result.OperatorContextID, &result.NoticeID, &result.ActorType, &result.ActorID,
		&result.NoticeType, &result.StartsAt, &result.EndsAt, &result.Status,
		&result.Reason, &result.SourceUpdatedAt, &result.SyncedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderAvailabilityProjection{}, fmt.Errorf("%w: stale availability projection", ErrConflict)
	}
	return result, err
}

func CaptainUnavailableAt(ctx context.Context, db *sql.DB, operatorContextID, captainID string, at time.Time) (bool, error) {
	operatorContextID = normalizeOperatorContextID(operatorContextID)
	captainID = strings.TrimSpace(captainID)
	if captainID == "" {
		return false, ErrInvalid
	}
	if at.IsZero() {
		at = time.Now().UTC()
	}
	var unavailable bool
	err := db.QueryRowContext(ctx, `SELECT EXISTS(
		SELECT 1 FROM dsh_provider_availability_projections
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2 AND status='active'
		  AND $3 >= starts_at AND $3 < ends_at
	)`, operatorContextID, captainID, at).Scan(&unavailable)
	return unavailable, err
}

func ApplyWorkforceAvailability(ctx context.Context, db *sql.DB, operatorContextID string, at time.Time, items []CaptainDispatchCandidate) error {
	if len(items) == 0 {
		return nil
	}
	if at.IsZero() {
		at = time.Now().UTC()
	}
	rows, err := db.QueryContext(ctx, `SELECT DISTINCT actor_id
		FROM dsh_provider_availability_projections
		WHERE operator_context_id=$1 AND actor_type='captain' AND status='active'
		  AND $2 >= starts_at AND $2 < ends_at`, normalizeOperatorContextID(operatorContextID), at)
	if err != nil {
		return err
	}
	defer rows.Close()
	blocked := make(map[string]struct{})
	for rows.Next() {
		var actorID string
		if err := rows.Scan(&actorID); err != nil {
			return err
		}
		blocked[actorID] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for index := range items {
		if _, exists := blocked[items[index].CaptainID]; exists {
			items[index].Eligible = false
			items[index].IneligibilityReason = "CAPTAIN_UNAVAILABLE_BY_WORKFORCE_NOTICE"
		}
	}
	return nil
}

type ServiceAreaCapacityPolicy struct {
	OperatorContextID                        string    `json:"operatorContextId"`
	ServiceAreaCode                 string    `json:"serviceAreaCode"`
	MinimumAvailableCaptains        int       `json:"minimumAvailableCaptains"`
	TargetAvailableCaptains         int       `json:"targetAvailableCaptains"`
	DemandBufferBasisPoints         int       `json:"demandBufferBasisPoints"`
	MassAbsenceThresholdBasisPoints int       `json:"massAbsenceThresholdBasisPoints"`
	ForecastHorizonMinutes          int       `json:"forecastHorizonMinutes"`
	UpdatedBy                       string    `json:"updatedBy"`
	Version                         int       `json:"version"`
	UpdatedAt                       time.Time `json:"updatedAt"`
}

type UpsertServiceAreaCapacityPolicyInput struct {
	OperatorContextID                        string `json:"operatorContextId"`
	ServiceAreaCode                 string `json:"serviceAreaCode"`
	MinimumAvailableCaptains        int    `json:"minimumAvailableCaptains"`
	TargetAvailableCaptains         int    `json:"targetAvailableCaptains"`
	DemandBufferBasisPoints         int    `json:"demandBufferBasisPoints"`
	MassAbsenceThresholdBasisPoints int    `json:"massAbsenceThresholdBasisPoints"`
	ForecastHorizonMinutes          int    `json:"forecastHorizonMinutes"`
	ExpectedVersion                 int    `json:"expectedVersion"`
	UpdatedBy                       string `json:"-"`
}

func UpsertServiceAreaCapacityPolicy(ctx context.Context, db *sql.DB, input UpsertServiceAreaCapacityPolicyInput) (ServiceAreaCapacityPolicy, error) {
	input.OperatorContextID = normalizeOperatorContextID(input.OperatorContextID)
	input.ServiceAreaCode = strings.TrimSpace(input.ServiceAreaCode)
	input.UpdatedBy = strings.TrimSpace(input.UpdatedBy)
	if input.MinimumAvailableCaptains < 0 || input.TargetAvailableCaptains < input.MinimumAvailableCaptains ||
		input.DemandBufferBasisPoints < 0 || input.DemandBufferBasisPoints > 10000 ||
		input.MassAbsenceThresholdBasisPoints <= 0 || input.MassAbsenceThresholdBasisPoints > 10000 ||
		input.ForecastHorizonMinutes < 15 || input.ForecastHorizonMinutes > 10080 ||
		input.ExpectedVersion < 0 || input.ServiceAreaCode == "" || input.UpdatedBy == "" {
		return ServiceAreaCapacityPolicy{}, ErrInvalid
	}
	var policy ServiceAreaCapacityPolicy
	err := db.QueryRowContext(ctx, `INSERT INTO dsh_service_area_capacity_policies(
		operator_context_id,service_area_code,minimum_available_captains,target_available_captains,
		demand_buffer_basis_points,mass_absence_threshold_basis_points,
		forecast_horizon_minutes,updated_by)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT(operator_context_id,service_area_code) DO UPDATE SET
			minimum_available_captains=EXCLUDED.minimum_available_captains,
			target_available_captains=EXCLUDED.target_available_captains,
			demand_buffer_basis_points=EXCLUDED.demand_buffer_basis_points,
			mass_absence_threshold_basis_points=EXCLUDED.mass_absence_threshold_basis_points,
			forecast_horizon_minutes=EXCLUDED.forecast_horizon_minutes,
			updated_by=EXCLUDED.updated_by,version=dsh_service_area_capacity_policies.version+1,
			updated_at=now()
		WHERE $9=0 OR dsh_service_area_capacity_policies.version=$9
		RETURNING operator_context_id,service_area_code,minimum_available_captains,
		target_available_captains,demand_buffer_basis_points,
		mass_absence_threshold_basis_points,forecast_horizon_minutes,
		updated_by,version,updated_at`,
		input.OperatorContextID, input.ServiceAreaCode, input.MinimumAvailableCaptains,
		input.TargetAvailableCaptains, input.DemandBufferBasisPoints,
		input.MassAbsenceThresholdBasisPoints, input.ForecastHorizonMinutes,
		input.UpdatedBy, input.ExpectedVersion,
	).Scan(
		&policy.OperatorContextID, &policy.ServiceAreaCode, &policy.MinimumAvailableCaptains,
		&policy.TargetAvailableCaptains, &policy.DemandBufferBasisPoints,
		&policy.MassAbsenceThresholdBasisPoints, &policy.ForecastHorizonMinutes,
		&policy.UpdatedBy, &policy.Version, &policy.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ServiceAreaCapacityPolicy{}, ErrConflict
	}
	return policy, err
}

func loadCapacityPolicy(ctx context.Context, db *sql.DB, operatorContextID, serviceAreaCode string) (ServiceAreaCapacityPolicy, error) {
	var policy ServiceAreaCapacityPolicy
	err := db.QueryRowContext(ctx, `SELECT operator_context_id,service_area_code,
		minimum_available_captains,target_available_captains,demand_buffer_basis_points,
		mass_absence_threshold_basis_points,forecast_horizon_minutes,updated_by,version,updated_at
		FROM dsh_service_area_capacity_policies WHERE operator_context_id=$1 AND service_area_code=$2`,
		normalizeOperatorContextID(operatorContextID), strings.TrimSpace(serviceAreaCode),
	).Scan(
		&policy.OperatorContextID, &policy.ServiceAreaCode, &policy.MinimumAvailableCaptains,
		&policy.TargetAvailableCaptains, &policy.DemandBufferBasisPoints,
		&policy.MassAbsenceThresholdBasisPoints, &policy.ForecastHorizonMinutes,
		&policy.UpdatedBy, &policy.Version, &policy.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ServiceAreaCapacityPolicy{
			OperatorContextID: normalizeOperatorContextID(operatorContextID), ServiceAreaCode: strings.TrimSpace(serviceAreaCode),
			MinimumAvailableCaptains: 1, TargetAvailableCaptains: 2,
			DemandBufferBasisPoints: 2000, MassAbsenceThresholdBasisPoints: 4000,
			ForecastHorizonMinutes: 180, UpdatedBy: "default", Version: 0,
		}, nil
	}
	return policy, err
}

type ServiceAreaCapacityForecast struct {
	OperatorContextID                   string                    `json:"operatorContextId"`
	ServiceAreaCode            string                    `json:"serviceAreaCode"`
	AsOf                       time.Time                 `json:"asOf"`
	HorizonEndsAt              time.Time                 `json:"horizonEndsAt"`
	TotalScopedCaptains        int                       `json:"totalScopedCaptains"`
	CurrentlyAvailableCaptains int                       `json:"currentlyAvailableCaptains"`
	ActiveAbsences             int                       `json:"activeAbsences"`
	PlannedAbsences            int                       `json:"plannedAbsences"`
	ProjectedAvailableCaptains int                       `json:"projectedAvailableCaptains"`
	OpenDemand                 int                       `json:"openDemand"`
	RequiredCaptains           int                       `json:"requiredCaptains"`
	CurrentShortage            int                       `json:"currentShortage"`
	ProjectedShortage          int                       `json:"projectedShortage"`
	MassAbsenceBasisPoints     int                       `json:"massAbsenceBasisPoints"`
	MassAbsenceRisk            bool                      `json:"massAbsenceRisk"`
	RiskLevel                  string                    `json:"riskLevel"`
	Policy                     ServiceAreaCapacityPolicy `json:"policy"`
}

func GetServiceAreaCapacityForecast(ctx context.Context, db *sql.DB, operatorContextID, serviceAreaCode string, at time.Time) (ServiceAreaCapacityForecast, error) {
	operatorContextID = normalizeOperatorContextID(operatorContextID)
	serviceAreaCode = strings.TrimSpace(serviceAreaCode)
	if serviceAreaCode == "" {
		return ServiceAreaCapacityForecast{}, ErrInvalid
	}
	if at.IsZero() {
		at = time.Now().UTC()
	}
	policy, err := loadCapacityPolicy(ctx, db, operatorContextID, serviceAreaCode)
	if err != nil {
		return ServiceAreaCapacityForecast{}, err
	}
	horizon := at.Add(time.Duration(policy.ForecastHorizonMinutes) * time.Minute)
	forecast := ServiceAreaCapacityForecast{
		OperatorContextID: operatorContextID, ServiceAreaCode: serviceAreaCode, AsOf: at,
		HorizonEndsAt: horizon, Policy: policy,
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT p.captain_id)::int
		FROM dsh_captain_dispatch_profiles p
		JOIN dsh_actor_service_area_scopes scope
		  ON scope.actor_id=p.captain_id AND scope.actor_role='captain'
		 AND scope.active=true AND scope.service_area_code=$2
		WHERE p.operator_context_id=$1`, operatorContextID, serviceAreaCode).Scan(&forecast.TotalScopedCaptains); err != nil {
		return forecast, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*)::int FROM (
		SELECT p.captain_id
		FROM dsh_captain_dispatch_profiles p
		JOIN dsh_actor_service_area_scopes scope
		  ON scope.actor_id=p.captain_id AND scope.actor_role='captain'
		 AND scope.active=true AND scope.service_area_code=$2
		LEFT JOIN dsh_captain_financial_eligibility financial
		  ON financial.operator_context_id=p.operator_context_id AND financial.captain_id=p.captain_id
		LEFT JOIN dsh_assignments assignment
		  ON assignment.operator_context_id=p.operator_context_id AND assignment.captain_id=p.captain_id
		 AND (assignment.status='accepted' OR (assignment.status='offered' AND assignment.response_deadline_at>$3))
		WHERE p.operator_context_id=$1 AND p.accreditation_status='approved'
		  AND p.availability_status='available'
		  AND COALESCE(financial.eligible,false)=true AND financial.expires_at>$3
		  AND NOT EXISTS (
		    SELECT 1 FROM dsh_provider_availability_projections absence
		    WHERE absence.operator_context_id=p.operator_context_id AND absence.actor_type='captain'
		      AND absence.actor_id=p.captain_id AND absence.status='active'
		      AND $3>=absence.starts_at AND $3<absence.ends_at
		  )
		GROUP BY p.captain_id,p.max_active_assignments
		HAVING COUNT(assignment.id)<p.max_active_assignments
	) available`, operatorContextID, serviceAreaCode, at).Scan(&forecast.CurrentlyAvailableCaptains); err != nil {
		return forecast, err
	}
	if err := db.QueryRowContext(ctx, `SELECT
		COUNT(DISTINCT actor_id) FILTER (WHERE $3>=starts_at AND $3<ends_at)::int,
		COUNT(DISTINCT actor_id) FILTER (WHERE starts_at>$3 AND starts_at<$4)::int
		FROM dsh_provider_availability_projections absence
		WHERE operator_context_id=$1 AND actor_type='captain' AND status='active'
		  AND EXISTS (SELECT 1 FROM dsh_actor_service_area_scopes scope
		    WHERE scope.actor_id=absence.actor_id AND scope.actor_role='captain'
		      AND scope.active=true AND scope.service_area_code=$2)`,
		operatorContextID, serviceAreaCode, at, horizon,
	).Scan(&forecast.ActiveAbsences, &forecast.PlannedAbsences); err != nil {
		return forecast, err
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*)::int
		FROM dsh_orders orders JOIN dsh_stores store ON store.id=orders.store_id
		WHERE orders.operator_context_id=$1 AND store.service_area_code=$2
		  AND orders.status IN ('store_accepted','preparing','ready_for_pickup','driver_assigned')`,
		operatorContextID, serviceAreaCode).Scan(&forecast.OpenDemand); err != nil {
		return forecast, err
	}
	forecast.ProjectedAvailableCaptains = maxInt(0, forecast.CurrentlyAvailableCaptains-forecast.PlannedAbsences)
	buffer := int(math.Ceil(float64(forecast.OpenDemand*policy.DemandBufferBasisPoints) / 10000.0))
	forecast.RequiredCaptains = maxInt(policy.MinimumAvailableCaptains, policy.TargetAvailableCaptains+buffer)
	forecast.CurrentShortage = maxInt(0, forecast.RequiredCaptains-forecast.CurrentlyAvailableCaptains)
	forecast.ProjectedShortage = maxInt(0, forecast.RequiredCaptains-forecast.ProjectedAvailableCaptains)
	if forecast.TotalScopedCaptains > 0 {
		forecast.MassAbsenceBasisPoints = ((forecast.ActiveAbsences + forecast.PlannedAbsences) * 10000) / forecast.TotalScopedCaptains
	}
	forecast.MassAbsenceRisk = forecast.MassAbsenceBasisPoints >= policy.MassAbsenceThresholdBasisPoints
	switch {
	case forecast.ProjectedShortage > 0 && forecast.MassAbsenceRisk:
		forecast.RiskLevel = "critical"
	case forecast.ProjectedShortage > 0 || forecast.MassAbsenceRisk:
		forecast.RiskLevel = "warning"
	default:
		forecast.RiskLevel = "healthy"
	}
	return forecast, nil
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

type OperationsHeatmapCell struct {
	CellKey         string  `json:"cellKey"`
	CenterLatitude  float64 `json:"centerLatitude"`
	CenterLongitude float64 `json:"centerLongitude"`
	CaptainCount    int     `json:"captainCount"`
	FreshCount      int     `json:"freshCount"`
	StaleCount      int     `json:"staleCount"`
	LostCount       int     `json:"lostCount"`
}

type heatmapAccumulator struct {
	OperationsHeatmapCell
	captains map[string]struct{}
}

func GetOperationsHeatmap(ctx context.Context, db *sql.DB, operatorContextID, serviceAreaCode string, now time.Time) ([]OperationsHeatmapCell, error) {
	operatorContextID = normalizeOperatorContextID(operatorContextID)
	serviceAreaCode = strings.TrimSpace(serviceAreaCode)
	if now.IsZero() {
		now = time.Now().UTC()
	}
	query := `SELECT DISTINCT ON (assignment.captain_id)
		assignment.captain_id,assignment.last_latitude,assignment.last_longitude,
		assignment.location_recorded_at
		FROM dsh_assignments assignment
		JOIN dsh_orders orders ON orders.id=assignment.order_id
		JOIN dsh_stores store ON store.id=orders.store_id
		WHERE assignment.operator_context_id=$1 AND assignment.status='accepted'
		  AND assignment.last_latitude IS NOT NULL AND assignment.last_longitude IS NOT NULL
		  AND assignment.location_recorded_at IS NOT NULL`
	args := []any{operatorContextID}
	if serviceAreaCode != "" {
		query += ` AND store.service_area_code=$2`
		args = append(args, serviceAreaCode)
	}
	query += ` ORDER BY assignment.captain_id,assignment.location_recorded_at DESC`
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cells := make(map[string]*heatmapAccumulator)
	for rows.Next() {
		var captainID string
		var latitude, longitude float64
		var recordedAt time.Time
		if err := rows.Scan(&captainID, &latitude, &longitude, &recordedAt); err != nil {
			return nil, err
		}
		latCell := math.Floor(latitude*100) / 100
		lonCell := math.Floor(longitude*100) / 100
		key := fmt.Sprintf("%.2f:%.2f", latCell, lonCell)
		cell := cells[key]
		if cell == nil {
			cell = &heatmapAccumulator{
				OperationsHeatmapCell: OperationsHeatmapCell{
					CellKey: key, CenterLatitude: latCell + 0.005, CenterLongitude: lonCell + 0.005,
				},
				captains: map[string]struct{}{},
			}
			cells[key] = cell
		}
		cell.captains[captainID] = struct{}{}
		age := now.Sub(recordedAt.UTC())
		switch {
		case age <= 5*time.Minute:
			cell.FreshCount++
		case age <= 10*time.Minute:
			cell.StaleCount++
		default:
			cell.LostCount++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	result := make([]OperationsHeatmapCell, 0, len(cells))
	for _, cell := range cells {
		cell.CaptainCount = len(cell.captains)
		result = append(result, cell.OperationsHeatmapCell)
	}
	return result, nil
}
