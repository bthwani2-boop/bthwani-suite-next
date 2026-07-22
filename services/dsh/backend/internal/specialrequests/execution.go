package specialrequests

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// ExecutionEvidence is a read-only projection over the dispatch owner. It does
// not duplicate assignment, delivery, proof, or exception truth inside the
// special-request aggregate.
type ExecutionEvidence struct {
	SpecialRequestID      string
	AssignmentID          *string
	CaptainID             *string
	AssignmentStatus      *string
	AssignmentCreatedAt   *time.Time
	AcceptedAt            *time.Time
	AssignmentCompletedAt *time.Time
	DeliveryStatus        *string
	PoDMethod             *string
	PoDReference          *string
	DeliveryNote          *string
	DeliveryUpdatedAt     *time.Time
	LatestException       *ExecutionException
}

type ExecutionException struct {
	ID               string
	ReasonCode       string
	Note             string
	Severity         string
	Status           string
	ReportedAt       time.Time
	AcknowledgedAt   *time.Time
	ResolvedAt       *time.Time
	ResolutionAction *string
	ResolutionNote   *string
}

func nullStringPointer(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	return &value.String
}

func nullTimePointer(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func (s *Service) ExecutionEvidenceInTenant(ctx context.Context, tenantID, requestID string) (*ExecutionEvidence, error) {
	if _, err := s.repo.GetInTenant(ctx, tenantID, requestID); err != nil {
		return nil, err
	}

	result := &ExecutionEvidence{SpecialRequestID: requestID}
	var (
		assignmentID, captainID, assignmentStatus              sql.NullString
		assignmentCreatedAt, acceptedAt, assignmentCompletedAt sql.NullTime
		deliveryStatus, podMethod, podReference, deliveryNote  sql.NullString
		deliveryUpdatedAt                                      sql.NullTime
	)
	err := s.repo.DB().QueryRowContext(ctx, `
		SELECT a.id::text, a.captain_id, a.status, a.created_at, a.accepted_at, a.completed_at,
		       d.status, NULLIF(d.pod_method, ''), NULLIF(d.pod_reference, ''), NULLIF(d.note, ''), d.updated_at
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		WHERE a.special_request_id = $1::uuid
		ORDER BY a.created_at DESC
		LIMIT 1`, requestID).Scan(
		&assignmentID, &captainID, &assignmentStatus, &assignmentCreatedAt, &acceptedAt, &assignmentCompletedAt,
		&deliveryStatus, &podMethod, &podReference, &deliveryNote, &deliveryUpdatedAt,
	)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		result.AssignmentID = nullStringPointer(assignmentID)
		result.CaptainID = nullStringPointer(captainID)
		result.AssignmentStatus = nullStringPointer(assignmentStatus)
		result.AssignmentCreatedAt = nullTimePointer(assignmentCreatedAt)
		result.AcceptedAt = nullTimePointer(acceptedAt)
		result.AssignmentCompletedAt = nullTimePointer(assignmentCompletedAt)
		result.DeliveryStatus = nullStringPointer(deliveryStatus)
		result.PoDMethod = nullStringPointer(podMethod)
		result.PoDReference = nullStringPointer(podReference)
		result.DeliveryNote = nullStringPointer(deliveryNote)
		result.DeliveryUpdatedAt = nullTimePointer(deliveryUpdatedAt)
	}

	var exception ExecutionException
	var acknowledgedAt, resolvedAt sql.NullTime
	var resolutionAction, resolutionNote sql.NullString
	err = s.repo.DB().QueryRowContext(ctx, `
		SELECT id::text, reason_code, note, severity, status, reported_at,
		       acknowledged_at, resolved_at, resolution_action, resolution_note
		FROM dsh_delivery_exceptions
		WHERE tenant_id = $1 AND special_request_id = $2::uuid
		ORDER BY reported_at DESC
		LIMIT 1`, tenantID, requestID).Scan(
		&exception.ID, &exception.ReasonCode, &exception.Note, &exception.Severity,
		&exception.Status, &exception.ReportedAt, &acknowledgedAt, &resolvedAt,
		&resolutionAction, &resolutionNote,
	)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		exception.AcknowledgedAt = nullTimePointer(acknowledgedAt)
		exception.ResolvedAt = nullTimePointer(resolvedAt)
		exception.ResolutionAction = nullStringPointer(resolutionAction)
		exception.ResolutionNote = nullStringPointer(resolutionNote)
		result.LatestException = &exception
	}

	return result, nil
}
