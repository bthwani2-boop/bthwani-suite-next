package partnerdelivery

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/orders"
)

func (s *Service) AssignCourierCommand(ctx context.Context, operatorContextID, orderID, storeCourierID, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	fingerprint := commandFingerprint("assign_courier", operatorContextID, orderID, storeCourierID)
	return s.executeCommand(ctx, operatorContextID, actorID, commandID, "assign_courier", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			task, err := s.assignCourier(ctx, operatorContextID, orderID, storeCourierID, actorID, actorRole, correlationID)
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
			return GetForOperatorContext(s.db, operatorContextID, task.ID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := GetByOrderIDForOperatorContext(s.db, operatorContextID, orderID)
			if errors.Is(err, ErrNotFound) {
				return nil, false, nil
			}
			if err != nil {
				return nil, false, err
			}
			return task, task.StoreCourierID == storeCourierID && task.Status != StatusUnassigned, nil
		})
}

func (s *Service) MarkPickedUpCommand(ctx context.Context, operatorContextID, taskID string, expectedVersion int, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("mark_picked_up", operatorContextID, taskID, fmt.Sprint(expectedVersion))
	return s.executeCommand(ctx, operatorContextID, actorID, commandID, "mark_picked_up", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.transitionForContext(ctx, operatorContextID, taskID, expectedVersion, []Status{StatusAssigned}, "", "picked_up_at", "mark_picked_up", "", actorID, actorRole, correlationID, &orderTransition{allowedFrom: []orders.OrderStatus{orders.StatusReadyForPickup}, to: orders.StatusPickedUp, note: "partner courier picked up order"})
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := GetForOperatorContext(s.db, operatorContextID, taskID)
			return task, err == nil && task.PickedUpAt != nil, err
		})
}

func (s *Service) MarkDepartedCommand(ctx context.Context, operatorContextID, taskID string, expectedVersion int, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("mark_departed", operatorContextID, taskID, fmt.Sprint(expectedVersion))
	return s.executeCommand(ctx, operatorContextID, actorID, commandID, "mark_departed", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.transitionForContext(ctx, operatorContextID, taskID, expectedVersion, []Status{StatusAssigned}, StatusDeparted, "departed_at", "mark_departed", "", actorID, actorRole, correlationID, nil)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := GetForOperatorContext(s.db, operatorContextID, taskID)
			return task, err == nil && task.DepartedAt != nil, err
		})
}

func (s *Service) MarkArrivedCommand(ctx context.Context, operatorContextID, taskID string, expectedVersion int, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	fingerprint := commandFingerprint("mark_arrived", operatorContextID, taskID, fmt.Sprint(expectedVersion))
	return s.executeCommand(ctx, operatorContextID, actorID, commandID, "mark_arrived", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.transitionForContext(ctx, operatorContextID, taskID, expectedVersion, []Status{StatusDeparted}, StatusArrived, "arrived_at", "mark_arrived", "", actorID, actorRole, correlationID, &orderTransition{allowedFrom: []orders.OrderStatus{orders.StatusPickedUp}, to: orders.StatusArrivedCustomer, note: "partner courier arrived at customer"})
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := GetForOperatorContext(s.db, operatorContextID, taskID)
			return task, err == nil && task.ArrivedAt != nil, err
		})
}

func (s *Service) SubmitProofCommand(ctx context.Context, operatorContextID, taskID string, expectedVersion int, proofMethod, proofReference, actorID, actorRole, correlationID, commandID string) (*PartnerDeliveryTask, error) {
	proofMethod = strings.TrimSpace(proofMethod)
	proofReference = strings.TrimSpace(proofReference)
	fingerprint := commandFingerprint("submit_proof", operatorContextID, taskID, fmt.Sprint(expectedVersion), proofMethod, proofReference)
	return s.executeCommand(ctx, operatorContextID, actorID, commandID, "submit_proof", fingerprint,
		func() (*PartnerDeliveryTask, error) {
			return s.submitProofForContext(ctx, operatorContextID, taskID, expectedVersion, proofMethod, proofReference, actorID, actorRole, correlationID)
		},
		func() (*PartnerDeliveryTask, bool, error) {
			task, err := GetForOperatorContext(s.db, operatorContextID, taskID)
			matched := err == nil && task.Status == StatusCompleted && task.ProofReference != nil && *task.ProofReference == proofReference
			return task, matched, err
		})
}
