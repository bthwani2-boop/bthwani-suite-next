package specialrequests

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"dsh-api/internal/wlt"
)

// ─── Sovereign state model ──────────────────────────────────────────────────

var terminalStatuses = map[RequestStatus]bool{
	StatusCompleted: true,
	StatusCancelled: true,
	StatusRejected:  true,
}

var validStatusTransitions = map[RequestStatus][]RequestStatus{
	StatusSubmitted:          {StatusUnderReview, StatusCancelled},
	StatusUnderReview:        {StatusNeedsCustomerInput, StatusApproved, StatusRejected, StatusCancelled},
	StatusNeedsCustomerInput: {StatusUnderReview, StatusApproved, StatusCancelled},
	StatusApproved:           {StatusAssigned, StatusCancelled},
	StatusAssigned:           {StatusInProgress, StatusApproved, StatusCancelled},
	StatusInProgress:         {StatusCompleted, StatusCancelled},
}

// clientCancellableStatuses are the statuses from which a client-initiated
// cancel is allowed.
var clientCancellableStatuses = map[RequestStatus]bool{
	StatusSubmitted:          true,
	StatusUnderReview:        true,
	StatusNeedsCustomerInput: true,
	StatusApproved:           true,
}

// moneyEditableStatuses are the statuses during which estimated-amount /
// currency fields may be set by an operator.
var moneyEditableStatuses = map[RequestStatus]bool{
	StatusUnderReview:        true,
	StatusNeedsCustomerInput: true,
}

// stageRule binds a workflowStage value to the global status it is valid
// under (or, for the terminal "any non-terminal status" stages, to a flag
// instead of a fixed status), plus its position in the forward-only stage
// ordering for its request type.
type stageRule struct {
	status         RequestStatus
	anyNonTerminal bool
	order          int
}

// sheinStageRules mirrors the SHEIN_ASSISTED_PURCHASE branch of the
// chk_special_request_stage CHECK constraint (dsh-054) and its backfill
// mapping.
var sheinStageRules = map[string]stageRule{
	"intake_review":      {status: StatusUnderReview, order: 0},
	"quote_pending":      {status: StatusUnderReview, order: 1},
	"customer_approval":  {status: StatusNeedsCustomerInput, order: 2},
	"batch_pending":      {status: StatusApproved, order: 3},
	"purchased":          {status: StatusApproved, order: 4},
	"inbound":            {status: StatusApproved, order: 5},
	"sorting":            {status: StatusApproved, order: 6},
	"ready_for_delivery": {status: StatusApproved, order: 7},
	"captain_assignment": {status: StatusAssigned, order: 8},
	"delivered":          {status: StatusCompleted, order: 9},
	"exception":          {anyNonTerminal: true, order: -1},
}

// awnakStageRules mirrors the AWNAK_ERRAND branch of the same constraint.
var awnakStageRules = map[string]stageRule{
	"intake":           {status: StatusUnderReview, order: 0},
	"quote_review":     {status: StatusUnderReview, order: 1},
	"dispatch_pending": {status: StatusApproved, order: 2},
	"assigned":         {status: StatusAssigned, order: 3},
	"in_progress":      {status: StatusInProgress, order: 4},
	"proof_review":     {status: StatusInProgress, order: 5},
	"completed":        {status: StatusCompleted, order: 6},
	"cancelled":        {status: StatusCancelled, order: 7},
	"escalated":        {anyNonTerminal: true, order: -1},
}

// sheinDefaultStage / awnakDefaultStage mirror the dsh-054 backfill CASE
// statements: the stage a status implies when no explicit workflowStage is
// supplied for a transition. Statuses absent from the map (submitted,
// cancelled for shein, rejected) default to no stage (nil).
var sheinDefaultStage = map[RequestStatus]string{
	StatusUnderReview:        "intake_review",
	StatusNeedsCustomerInput: "customer_approval",
	StatusApproved:           "batch_pending",
	StatusAssigned:           "captain_assignment",
	StatusInProgress:         "ready_for_delivery",
	StatusCompleted:          "delivered",
}

var awnakDefaultStage = map[RequestStatus]string{
	StatusUnderReview:        "intake",
	StatusNeedsCustomerInput: "quote_review",
	StatusApproved:           "dispatch_pending",
	StatusAssigned:           "assigned",
	StatusInProgress:         "in_progress",
	StatusCompleted:          "completed",
	StatusCancelled:          "cancelled",
}

func stageRulesFor(reqType RequestType) map[string]stageRule {
	if reqType == TypeAwnakErrand {
		return awnakStageRules
	}
	return sheinStageRules
}

func defaultStageFor(reqType RequestType, status RequestStatus) *string {
	table := sheinDefaultStage
	if reqType == TypeAwnakErrand {
		table = awnakDefaultStage
	}
	if v, ok := table[status]; ok {
		stage := v
		return &stage
	}
	return nil
}

// stageMatchesStatus enforces the stage -> required-status consistency map:
// a stage may only be set when the resulting status matches, except the
// "any non-terminal" stages (exception / escalated), which are valid under
// any non-terminal status.
func stageMatchesStatus(rule stageRule, status RequestStatus) bool {
	if rule.anyNonTerminal {
		return !terminalStatuses[status]
	}
	return rule.status == status
}

// stageOrderOK enforces forward-only movement within a request type's
// ordered stage list. The "any non-terminal" stages (exception / escalated)
// are reachable from any non-terminal stage, and moving away from one of
// them is allowed to any stage that is otherwise valid for the current
// status (ordering is not re-checked in that case).
func stageOrderOK(rules map[string]stageRule, from *string, toRule stageRule) bool {
	if toRule.anyNonTerminal {
		return true
	}
	if from == nil {
		return true
	}
	fromRule, ok := rules[*from]
	if !ok || fromRule.anyNonTerminal {
		return true
	}
	return toRule.order >= fromRule.order
}

// ─── Service ─────────────────────────────────────────────────────────────

type Service struct {
	repo      *PostgresRepository
	wltClient *wlt.Client
}

func NewService(repo *PostgresRepository) *Service {
	return &Service{repo: repo}
}

// SetWltClient wires an optional WLT client onto the service so
// CancelForClient can make a best-effort attempt to expire a dangling WLT
// payment session on cancellation. It is a setter rather than a constructor
// parameter to avoid touching NewService's other call sites (get/list/
// operator-transition/dispatch handlers), which never need WLT awareness.
func (s *Service) SetWltClient(c *wlt.Client) {
	s.wltClient = c
}

const (
	maxNotesLength   = 2000
	maxAddressLength = 500
)

const DefaultTenantID = "tenant-dev-001"

func tenantOrDefault(tenantID string) string {
	if strings.TrimSpace(tenantID) == "" {
		return DefaultTenantID
	}
	return strings.TrimSpace(tenantID)
}

func (s *Service) Create(ctx context.Context, clientID string, in CreateInput) (*SpecialRequest, error) {
	return s.CreateInTenant(ctx, tenantOrDefault(in.TenantID), clientID, in)
}

func (s *Service) CreateInTenant(ctx context.Context, tenantID string, clientID string, in CreateInput) (*SpecialRequest, error) {
	if tenantID == "" {
		return nil, fmt.Errorf("%w: tenant is required", ErrInvalid)
	}
	if clientID == "" {
		return nil, fmt.Errorf("%w: client is required", ErrInvalid)
	}
	if in.RequestType != TypeSheinAssistedPurchase && in.RequestType != TypeAwnakErrand {
		return nil, fmt.Errorf("%w: requestType must be SHEIN_ASSISTED_PURCHASE or AWNAK_ERRAND", ErrInvalid)
	}

	if err := validateTextField("customerNotes", in.CustomerNotes, maxNotesLength); err != nil {
		return nil, err
	}
	if err := validateTextField("variantNotes", in.VariantNotes, maxNotesLength); err != nil {
		return nil, err
	}
	if err := validateTextField("handlingRequirements", in.HandlingRequirements, maxNotesLength); err != nil {
		return nil, err
	}
	if err := validateTextField("deliveryAddressReference", in.DeliveryAddressReference, maxAddressLength); err != nil {
		return nil, err
	}
	if err := validateTextField("pickupAddressReference", in.PickupAddressReference, maxAddressLength); err != nil {
		return nil, err
	}
	if err := validateTextField("dropoffAddressReference", in.DropoffAddressReference, maxAddressLength); err != nil {
		return nil, err
	}

	switch in.ScheduleMode {
	case nil:
	default:
		mode := *in.ScheduleMode
		if mode != "" && mode != "asap" && mode != "scheduled" {
			return nil, fmt.Errorf("%w: scheduleMode must be asap or scheduled", ErrInvalid)
		}
		if mode == "scheduled" {
			if in.ScheduledAt == nil {
				return nil, fmt.Errorf("%w: scheduledAt is required when scheduleMode is scheduled", ErrInvalid)
			}
			if !in.ScheduledAt.After(time.Now()) {
				return nil, fmt.Errorf("%w: scheduledAt must be in the future", ErrInvalid)
			}
		}
	}

	switch in.RequestType {
	case TypeSheinAssistedPurchase:
		if in.ProductUrl == nil || strings.TrimSpace(*in.ProductUrl) == "" {
			return nil, fmt.Errorf("%w: productUrl is required", ErrInvalid)
		}
		parsed, err := url.Parse(*in.ProductUrl)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
			return nil, fmt.Errorf("%w: productUrl must be a valid http(s) URL", ErrInvalid)
		}
		if in.Quantity == nil || *in.Quantity <= 0 || *in.Quantity > 1000 {
			return nil, fmt.Errorf("%w: quantity must be between 1 and 1000", ErrInvalid)
		}
	case TypeAwnakErrand:
		hasPickup := (in.PickupAddressReference != nil && strings.TrimSpace(*in.PickupAddressReference) != "") || len(in.PickupLocation) > 0
		if !hasPickup {
			return nil, fmt.Errorf("%w: pickup location is required", ErrInvalid)
		}
		hasDropoff := (in.DropoffAddressReference != nil && strings.TrimSpace(*in.DropoffAddressReference) != "") || len(in.DropoffLocation) > 0
		if !hasDropoff {
			return nil, fmt.Errorf("%w: dropoff location is required", ErrInvalid)
		}
	}

	in.TenantID = tenantID
	in.ClientID = clientID
	in.workflowStage = firstStageFor(in.RequestType)

	tx, err := s.repo.DB().Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	req, err := s.repo.CreateTx(ctx, tx, in)
	if err != nil {
		return nil, err
	}

	correlationID := ""
	if in.CorrelationID != nil {
		correlationID = *in.CorrelationID
	}
	if err := WriteAuditEvent(tx, req.ID, clientID, "client", "create", "", correlationID, nil, requestJSON(req)); err != nil {
		return nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return req, nil
}

// firstStageFor is the intake stage a newly submitted request starts in.
func firstStageFor(reqType RequestType) *string {
	stage := "intake_review"
	if reqType == TypeAwnakErrand {
		stage = "intake"
	}
	return &stage
}

// requestJSON marshals a SpecialRequest to JSON bytes for audit purposes.
func requestJSON(req *SpecialRequest) []byte {
	b, _ := json.Marshal(req)
	return b
}

func validateTextField(field string, value *string, maxLen int) error {
	if value == nil {
		return nil
	}
	if len(*value) > maxLen {
		return fmt.Errorf("%w: %s must be %d characters or fewer", ErrInvalid, field, maxLen)
	}
	return nil
}

func (s *Service) GetForClient(ctx context.Context, id, clientID string) (*SpecialRequest, error) {
	return s.GetForClientInTenant(ctx, DefaultTenantID, id, clientID)
}

func (s *Service) GetForClientInTenant(ctx context.Context, tenantID string, id, clientID string) (*SpecialRequest, error) {
	req, err := s.repo.GetInTenant(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if req.ClientID != clientID {
		return nil, ErrNotFound
	}
	return req, nil
}

func (s *Service) ListForClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	return s.ListForClientInTenant(ctx, DefaultTenantID, clientID, limit, offset)
}

func (s *Service) ListForClientInTenant(ctx context.Context, tenantID string, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	return s.repo.ListByClientInTenant(ctx, tenantID, clientID, limit, offset)
}

func (s *Service) GetForOperator(ctx context.Context, id string) (*SpecialRequest, error) {
	return s.GetForOperatorInTenant(ctx, DefaultTenantID, id)
}

func (s *Service) GetForOperatorInTenant(ctx context.Context, tenantID string, id string) (*SpecialRequest, error) {
	return s.repo.GetInTenant(ctx, tenantID, id)
}

func (s *Service) ListForOperator(ctx context.Context, reqType, status, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error) {
	return s.ListForOperatorInTenant(ctx, DefaultTenantID, reqType, status, workflowStage, limit, offset)
}

func (s *Service) ListForOperatorInTenant(ctx context.Context, tenantID string, reqType, status, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error) {
	if reqType != nil && *reqType != "" {
		rt := RequestType(*reqType)
		if rt != TypeSheinAssistedPurchase && rt != TypeAwnakErrand {
			return nil, 0, fmt.Errorf("%w: requestType is invalid", ErrInvalid)
		}
	}
	if status != nil && *status != "" {
		if !isValidStatus(RequestStatus(*status)) {
			return nil, 0, fmt.Errorf("%w: status is invalid", ErrInvalid)
		}
	}
	return s.repo.ListForOperatorInTenant(ctx, tenantID, reqType, status, workflowStage, limit, offset)
}

func isValidStatus(status RequestStatus) bool {
	switch status {
	case StatusSubmitted, StatusUnderReview, StatusNeedsCustomerInput, StatusApproved,
		StatusAssigned, StatusInProgress, StatusCompleted, StatusCancelled, StatusRejected:
		return true
	default:
		return false
	}
}

func (s *Service) CancelForClient(ctx context.Context, id, clientID string, expectedVersion *int) (*SpecialRequest, error) {
	return s.CancelForClientInTenant(ctx, DefaultTenantID, id, clientID, expectedVersion)
}

func (s *Service) CancelForClientInTenant(ctx context.Context, tenantID string, id, clientID string, expectedVersion *int) (*SpecialRequest, error) {
	current, err := s.repo.GetInTenant(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if current.ClientID != clientID {
		return nil, ErrNotFound
	}
	if !clientCancellableStatuses[current.Status] {
		return nil, fmt.Errorf("%w: cannot cancel from status %s", ErrConflict, current.Status)
	}

	version := current.Version
	if expectedVersion != nil {
		version = *expectedVersion
	}

	status := StatusCancelled
	update := UpdateInput{
		Status:         &status,
		setCancelledAt: true,
	}

	tx, err := s.repo.DB().Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	updated, err := s.repo.UpdateInTenantTx(ctx, tx, tenantID, id, version, update)
	if err != nil {
		return nil, err
	}

	correlationID := ""
	if current.CorrelationID != nil {
		correlationID = *current.CorrelationID
	}
	if err := WriteAuditEvent(tx, id, clientID, "client", "cancel", "", correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Best-effort: if a WLT payment session was attached, ask WLT to expire
	// it so it doesn't dangle forever. This is a synchronous, lower-durability
	// interim compared to checkout's durable outbox (checkoutfinanceoutbox);
	// a failure here is logged and ignored rather than failing the cancel.
	if s.wltClient != nil && current.WltPaymentSessionID != nil {
		if err := s.wltClient.ExpireSession(ctx, *current.WltPaymentSessionID, correlationID); err != nil {
			log.Printf("[special-requests] failed to expire WLT payment session %s for request %s: %v", *current.WltPaymentSessionID, id, err)
		}
	}

	return updated, nil
}

func (s *Service) ApplyOperatorTransition(ctx context.Context, id string, expectedVersion int, in UpdateInput) (*SpecialRequest, error) {
	return s.ApplyOperatorTransitionInTenant(ctx, DefaultTenantID, id, expectedVersion, in)
}

func (s *Service) ApplyOperatorTransitionInTenant(ctx context.Context, tenantID string, id string, expectedVersion int, in UpdateInput) (*SpecialRequest, error) {
	current, err := s.repo.GetInTenant(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if terminalStatuses[current.Status] {
		return nil, fmt.Errorf("%w: request is in a terminal state", ErrConflict)
	}

	newStatus := current.Status
	if in.Status != nil {
		allowed := validStatusTransitions[current.Status]
		ok := false
		for _, s := range allowed {
			if s == *in.Status {
				ok = true
				break
			}
		}
		if !ok {
			return nil, fmt.Errorf("%w: cannot transition from %s to %s", ErrConflict, current.Status, *in.Status)
		}
		newStatus = *in.Status
		if newStatus == StatusRejected && (in.RejectionReason == nil || strings.TrimSpace(*in.RejectionReason) == "") {
			return nil, fmt.Errorf("%w: rejectionReason is required when rejecting", ErrInvalid)
		}
	}

	rules := stageRulesFor(current.RequestType)
	var targetStage *string
	if in.WorkflowStage != nil {
		stage := *in.WorkflowStage
		rule, ok := rules[stage]
		if !ok {
			return nil, fmt.Errorf("%w: workflowStage is invalid for this request type", ErrInvalid)
		}
		if !stageOrderOK(rules, current.WorkflowStage, rule) {
			return nil, fmt.Errorf("%w: workflowStage cannot move backward", ErrConflict)
		}
		if !stageMatchesStatus(rule, newStatus) {
			return nil, fmt.Errorf("%w: workflowStage is not valid for status %s", ErrConflict, newStatus)
		}
		targetStage = &stage
	} else if in.Status != nil {
		targetStage = defaultStageFor(current.RequestType, newStatus)
	}

	if in.EstimatedAmountMinorUnits != nil || in.Currency != nil {
		if !moneyEditableStatuses[newStatus] {
			return nil, fmt.Errorf("%w: money fields can only be set while under review", ErrConflict)
		}
	}

	update := UpdateInput{
		WorkflowStage:             targetStage,
		AssignedOperatorID:        in.AssignedOperatorID,
		RejectionReason:           in.RejectionReason,
		EstimatedAmountMinorUnits: in.EstimatedAmountMinorUnits,
		Currency:                  in.Currency,
		WltPaymentSessionID:       in.WltPaymentSessionID,
		QuotePreparedAt:           in.QuotePreparedAt,
		CustomerApprovedAt:        in.CustomerApprovedAt,
		PurchaseBatchID:           in.PurchaseBatchID,
		PurchasedAt:               in.PurchasedAt,
		InboundReference:          in.InboundReference,
		InboundReceivedAt:         in.InboundReceivedAt,
		SortingStartedAt:          in.SortingStartedAt,
		SortingCompletedAt:        in.SortingCompletedAt,
		FulfillmentPreparedAt:     in.FulfillmentPreparedAt,
		ReadyForDeliveryAt:        in.ReadyForDeliveryAt,
		CaptainAssignedAt:         in.CaptainAssignedAt,
		PickedUpAt:                in.PickedUpAt,
		DeliveredAt:               in.DeliveredAt,
	}
	if in.Status != nil {
		update.Status = in.Status
		update.setCompletedAt = newStatus == StatusCompleted && current.Status != StatusCompleted
		update.setCancelledAt = newStatus == StatusCancelled && current.Status != StatusCancelled
	}

	tx, err := s.repo.DB().Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	updated, err := s.repo.UpdateInTenantTx(ctx, tx, tenantID, id, expectedVersion, update)
	if err != nil {
		return nil, err
	}

	correlationID := ""
	if current.CorrelationID != nil {
		correlationID = *current.CorrelationID
	}
	if err := WriteAuditEvent(tx, id, "operator", "operator", "transition", "", correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return updated, nil
}
