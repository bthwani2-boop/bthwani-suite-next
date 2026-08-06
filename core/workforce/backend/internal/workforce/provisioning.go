package workforce

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"workforce-api/internal/identityclient"
)

type ProvisioningOrchestrator struct {
	repo     *Repository
	identity *identityclient.Client
	service  *Service
	now      func() time.Time
}

func NewProvisioningOrchestrator(repo *Repository, identity *identityclient.Client, service *Service) *ProvisioningOrchestrator {
	return &ProvisioningOrchestrator{
		repo:     repo,
		identity: identity,
		service:  service,
		now:      time.Now,
	}
}

type ProvisioningRequest struct {
	IdempotencyKey    string          `json:"idempotencyKey"`
	WorkforceKind     string          `json:"workforceKind"`
	Username          string          `json:"username"`
	PhoneE164         string          `json:"phoneE164"`
	Role              string          `json:"role"` // Identity role
	OperatorContextID string          `json:"operatorContextId"`
	Payload           json.RawMessage `json:"payload"` // Workforce payload
}

func (o *ProvisioningOrchestrator) StartCase(ctx context.Context, req ProvisioningRequest) (ProvisioningCase, error) {
	if req.IdempotencyKey == "" {
		return ProvisioningCase{}, errors.New("idempotencyKey required")
	}

	payloadBytes, _ := json.Marshal(req)

	pc := ProvisioningCase{
		ID:             uuid.New().String(),
		IdempotencyKey: req.IdempotencyKey,
		Status:         "DRAFT",
		WorkforceKind:  req.WorkforceKind,
		Payload:        payloadBytes,
	}

	err := o.repo.CreateProvisioningCase(ctx, pc)
	if err != nil {
		return ProvisioningCase{}, err
	}
	return pc, nil
}

func (o *ProvisioningOrchestrator) Advance(ctx context.Context, operator Operator, id string) (ProvisioningCase, error) {
	pc, err := o.repo.GetProvisioningCase(ctx, id)
	if err != nil {
		return ProvisioningCase{}, err
	}

	if pc.Status == "COMPLETED" || pc.Status == "READY_FOR_ACTIVATION" || pc.Status == "COMPENSATED" {
		return pc, nil
	}

	var req ProvisioningRequest
	if err := json.Unmarshal(pc.Payload, &req); err != nil {
		return pc, err
	}

	// 1. ACTOR_CREATED
	if pc.Status == "DRAFT" || pc.Status == "VALIDATED" {
		actorView, err := o.identity.Provision(ctx, identityclient.ProvisionInput{
			Username:          req.Username,
			PhoneE164:         req.PhoneE164,
			Role:              req.Role,
			OperatorContextID: req.OperatorContextID,
		})
		if err != nil {
			pc.Status = "FAILED_RETRYABLE"
			pc.FailureReason = err.Error()
			_ = o.repo.UpdateProvisioningCase(ctx, pc)
			return pc, err
		}
		pc.ActorID = actorView.ActorID
		pc.Status = "ACTOR_CREATED"
		_ = o.repo.UpdateProvisioningCase(ctx, pc)
	}

	// 2. WORKFORCE_CREATED
	if pc.Status == "ACTOR_CREATED" {
		var err error
		if req.WorkforceKind == "employee" {
			var input CreateEmployeeInput
			if err = json.Unmarshal(req.Payload, &input); err == nil {
				input.ActorID = pc.ActorID
				_, _, err = o.service.CreateEmployee(ctx, operator, input, pc.IdempotencyKey, "")
			}
		} else if req.WorkforceKind == "captain" {
			var input CreateCaptainInput
			if err = json.Unmarshal(req.Payload, &input); err == nil {
				input.ActorID = pc.ActorID
				_, _, err = o.service.CreateCaptain(ctx, operator, input, pc.IdempotencyKey, "")
			}
		} else if req.WorkforceKind == "field" {
			var input CreateFieldAgentInput
			if err = json.Unmarshal(req.Payload, &input); err == nil {
				input.ActorID = pc.ActorID
				_, _, err = o.service.CreateFieldAgent(ctx, operator, input, pc.IdempotencyKey, "")
			}
		} else {
			err = errors.New("unsupported workforce kind")
		}

		if err != nil {
			pc.Status = "FAILED_COMPENSATION_REQUIRED"
			pc.FailureReason = err.Error()
			_ = o.repo.UpdateProvisioningCase(ctx, pc)
			
			// Compensation trigger:
			deprovisionErr := o.identity.Deprovision(ctx, pc.ActorID)
			if deprovisionErr == nil {
				pc.Status = "COMPENSATED"
				pc.FailureReason = fmt.Sprintf("compensated after workforce failure: %v", err)
				_ = o.repo.UpdateProvisioningCase(ctx, pc)
			}
			return pc, err
		}

		pc.Status = "READY_FOR_ACTIVATION"
		_ = o.repo.UpdateProvisioningCase(ctx, pc)
	}

	return pc, nil
}
