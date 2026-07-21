package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type AssignmentGovernance struct {
	AssignmentID          string     `json:"assignmentId"`
	TenantID              string     `json:"tenantId"`
	ServiceAreaCode       string     `json:"serviceAreaCode"`
	Priority              int        `json:"priority"`
	DistanceMeters        *int       `json:"distanceMeters,omitempty"`
	OfferReason           string     `json:"offerReason,omitempty"`
	ResponseReason        string     `json:"responseReason,omitempty"`
	ExpiredAt             *time.Time `json:"expiredAt,omitempty"`
	CancelledAt           *time.Time `json:"cancelledAt,omitempty"`
	CancelledBy           string     `json:"cancelledBy,omitempty"`
	SupersedesAssignmentID string    `json:"supersedesAssignmentId,omitempty"`
	Version               int        `json:"version"`
}

func GetAssignmentGovernance(db *sql.DB, assignmentID string) (*AssignmentGovernance, error) {
	assignmentID = strings.TrimSpace(assignmentID)
	if assignmentID == "" {
		return nil, fmt.Errorf("%w: assignmentId is required", ErrInvalid)
	}
	var item AssignmentGovernance
	err := db.QueryRow(`
		SELECT id::text, tenant_id, COALESCE(service_area_code,''), priority,
		       distance_meters, COALESCE(offer_reason,''), COALESCE(response_reason,''),
		       expired_at, cancelled_at, COALESCE(cancelled_by,''),
		       COALESCE(supersedes_assignment_id::text,''), version
		FROM dsh_assignments WHERE id=$1::uuid`, assignmentID,
	).Scan(
		&item.AssignmentID, &item.TenantID, &item.ServiceAreaCode, &item.Priority,
		&item.DistanceMeters, &item.OfferReason, &item.ResponseReason,
		&item.ExpiredAt, &item.CancelledAt, &item.CancelledBy,
		&item.SupersedesAssignmentID, &item.Version,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &item, err
}

func ListAssignmentGovernance(db *sql.DB, assignmentIDs []string) (map[string]AssignmentGovernance, error) {
	if len(assignmentIDs) == 0 {
		return map[string]AssignmentGovernance{}, nil
	}
	rows, err := db.Query(`
		SELECT id::text, tenant_id, COALESCE(service_area_code,''), priority,
		       distance_meters, COALESCE(offer_reason,''), COALESCE(response_reason,''),
		       expired_at, cancelled_at, COALESCE(cancelled_by,''),
		       COALESCE(supersedes_assignment_id::text,''), version
		FROM dsh_assignments WHERE id::text = ANY($1)`, assignmentIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make(map[string]AssignmentGovernance, len(assignmentIDs))
	for rows.Next() {
		var item AssignmentGovernance
		if err = rows.Scan(
			&item.AssignmentID, &item.TenantID, &item.ServiceAreaCode, &item.Priority,
			&item.DistanceMeters, &item.OfferReason, &item.ResponseReason,
			&item.ExpiredAt, &item.CancelledAt, &item.CancelledBy,
			&item.SupersedesAssignmentID, &item.Version,
		); err != nil {
			return nil, err
		}
		items[item.AssignmentID] = item
	}
	return items, rows.Err()
}
