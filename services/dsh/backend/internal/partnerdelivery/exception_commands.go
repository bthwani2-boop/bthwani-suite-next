package partnerdelivery

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

func sanitizeEvidenceReferences(values []string) ([]string, error) {
	if len(values) > 10 {
		return nil, fmt.Errorf("%w: no more than 10 evidence references are allowed", ErrInvalid)
	}
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if len(value) > 512 {
			return nil, fmt.Errorf("%w: evidence reference is too long", ErrInvalid)
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result, nil
}

func (s *Service) RaiseExceptionCommand(ctx context.Context, taskID string, expectedVersion int, reason string, evidenceReferences []string, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	evidenceReferences, err := sanitizeEvidenceReferences(evidenceReferences)
	if err != nil {
		return nil, err
	}
	evidenceJSON, _ := json.Marshal(evidenceReferences)
	fingerprint := commandFingerprint("raise_exception", taskID, fmt.Sprint(expectedVersion), reason, string(evidenceJSON))
	return s.executeCommand(ctx, actorID, commandID, "raise_exception", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.raiseExceptionWithEvidence(ctx, taskID, expectedVersion, reason, evidenceJSON, actorID, actorRole, correlationID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := Get(s.db, taskID)
			matched := err == nil && task.Status == StatusException && task.ExceptionReason != nil && *task.ExceptionReason == reason
			return task, matched, err
		})
}

func (s *Service) raiseExceptionWithEvidence(ctx context.Context, taskID string, expectedVersion int, reason string, evidenceJSON []byte, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := GetForUpdate(tx, taskID)
	if err != nil {
		return nil, err
	}
	if current.Version != expectedVersion {
		return nil, ErrVersionConflict
	}
	if !containsStatus([]Status{StatusUnassigned, StatusAssigned, StatusDeparted, StatusArrived, StatusProofPending}, current.Status) {
		return nil, fmt.Errorf("%w: cannot raise_exception from status %s", ErrConflict, current.Status)
	}
	fromJSON := taskJSON(current)
	res, err := tx.Exec(`
		UPDATE dsh_partner_delivery_tasks
		SET status = $1,
		    exception_reason = $2,
		    exception_evidence_references = $3::jsonb,
		    exception_reported_at = NOW(),
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $4 AND version = $5`,
		string(StatusException), reason, string(evidenceJSON), taskID, expectedVersion)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}
	updated, err := scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
	if err != nil {
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "raise_exception", reason, correlationID, fromJSON, taskJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "partner_delivery_raise_exception", updated, correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return Get(s.db, updated.ID)
}
