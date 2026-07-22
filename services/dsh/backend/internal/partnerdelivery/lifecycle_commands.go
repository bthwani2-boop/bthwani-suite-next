package partnerdelivery

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

func (s *Service) AssignCourierCommand(ctx context.Context, orderID, storeCourierID, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("assign_courier", orderID, storeCourierID)
	return s.executeCommand(ctx, actorID, commandID, "assign_courier", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			task, err := s.AssignCourier(ctx, orderID, storeCourierID, actorID, actorRole, correlationID)
			if err != nil {
				return nil, err
			}
			if _, err := s.db.ExecContext(ctx, `
				UPDATE dsh_partner_delivery_tasks
				SET exception_reason = NULL,
				    exception_evidence_references = '[]'::jsonb,
				    exception_reported_at = NULL,
				    updated_at = NOW()
				WHERE id = $1`, task.ID); err != nil {
				return nil, err
			}
			return Get(s.db, task.ID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := GetByOrderID(s.db, orderID)
			if errors.Is(err, ErrNotFound) {
				return nil, false, nil
			}
			if err != nil {
				return nil, false, err
			}
			return task, task.StoreCourierID == storeCourierID && task.Status != StatusUnassigned, nil
		})
}

func (s *Service) MarkPickedUpCommand(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("mark_picked_up", taskID, fmt.Sprint(expectedVersion))
	return s.executeCommand(ctx, actorID, commandID, "mark_picked_up", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.MarkPickedUp(ctx, taskID, expectedVersion, actorID, actorRole, correlationID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := Get(s.db, taskID)
			return task, err == nil && task.PickedUpAt != nil, err
		})
}

func (s *Service) MarkDepartedCommand(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("mark_departed", taskID, fmt.Sprint(expectedVersion))
	return s.executeCommand(ctx, actorID, commandID, "mark_departed", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.MarkDeparted(ctx, taskID, expectedVersion, actorID, actorRole, correlationID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := Get(s.db, taskID)
			return task, err == nil && task.DepartedAt != nil, err
		})
}

func (s *Service) MarkArrivedCommand(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("mark_arrived", taskID, fmt.Sprint(expectedVersion))
	return s.executeCommand(ctx, actorID, commandID, "mark_arrived", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.MarkArrived(ctx, taskID, expectedVersion, actorID, actorRole, correlationID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := Get(s.db, taskID)
			return task, err == nil && task.ArrivedAt != nil, err
		})
}

func (s *Service) SubmitProofCommand(ctx context.Context, taskID string, expectedVersion int, proofMethod, proofReference, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	proofMethod = strings.TrimSpace(proofMethod)
	proofReference = strings.TrimSpace(proofReference)
	fingerprint := commandFingerprint("submit_proof", taskID, fmt.Sprint(expectedVersion), proofMethod, proofReference)
	return s.executeCommand(ctx, actorID, commandID, "submit_proof", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.SubmitProof(ctx, taskID, expectedVersion, proofMethod, proofReference, actorID, actorRole, correlationID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := Get(s.db, taskID)
			matched := err == nil && task.Status == StatusCompleted && task.ProofReference != nil && *task.ProofReference == proofReference
			return task, matched, err
		})
}
