package specialrequests

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

func TestInformationExchangeValidationAndCanonicalStage(t *testing.T) {
	if _, err := validateInformationText("question", "short", 5); err != nil {
		t.Fatalf("valid question rejected: %v", err)
	}
	if _, err := validateInformationText("question", " no ", 5); err == nil {
		t.Fatal("short question must be rejected")
	}
	for _, requestType := range []RequestType{TypeSheinAssistedPurchase, TypeAwnakErrand} {
		rule, ok := stageRulesFor(requestType)["customer_information"]
		if !ok {
			t.Fatalf("%s missing customer_information stage", requestType)
		}
		if !stageMatchesStatus(rule, StatusNeedsCustomerInput) {
			t.Fatalf("%s customer_information must require needs_customer_input", requestType)
		}
	}
}

func TestInformationExchangeRequestRespondAndReplayDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()
	clientID := newClientID(t)
	req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validSheinInput(clientID))
	if err != nil {
		t.Fatalf("create special request: %v", err)
	}
	cleanupRequest(t, db, req.ID)

	requested, exchange, err := svc.RequestClientInformationInOperatorContext(
		ctx, testOperatorContextID, req.ID, uuid.NewString(), req.Version,
		"Please provide the required information",
	)
	if err != nil {
		t.Fatalf("request client information: %v", err)
	}
	if requested.Status != StatusNeedsCustomerInput || requested.WorkflowStage == nil || *requested.WorkflowStage != "customer_information" {
		t.Fatalf("request must enter customer information stage: %#v", requested)
	}
	if exchange.Status != "pending" || exchange.RequestVersionAtRequest != requested.Version {
		t.Fatalf("unexpected pending information exchange: %#v", exchange)
	}

	mutation := InformationResponseMutationContext{
		IdempotencyKey: "information-response-" + testSuffix(),
		CorrelationID:  "information-correlation-" + testSuffix(),
	}
	responded, answered, err := svc.RespondClientInformationInOperatorContext(
		ctx, testOperatorContextID, req.ID, clientID, exchange.ID, requested.Version,
		"Here is the requested information", mutation,
	)
	if err != nil {
		t.Fatalf("respond to client information request: %v", err)
	}
	if responded.Status != StatusUnderReview || responded.WorkflowStage == nil || *responded.WorkflowStage != "quote_pending" {
		t.Fatalf("response must return request to governed review: %#v", responded)
	}
	if answered.Status != "responded" || answered.Response == nil || *answered.Response != "Here is the requested information" {
		t.Fatalf("unexpected answered information exchange: %#v", answered)
	}

	replayedRequest, replayedExchange, err := svc.RespondClientInformationInOperatorContext(
		ctx, testOperatorContextID, req.ID, clientID, exchange.ID, requested.Version,
		"Here is the requested information", mutation,
	)
	if err != nil {
		t.Fatalf("replay client information response: %v", err)
	}
	if replayedRequest.Version != responded.Version || replayedExchange.ID != answered.ID || replayedExchange.Status != answered.Status {
		t.Fatalf("replay must return committed response without a second mutation: request=%#v exchange=%#v", replayedRequest, replayedExchange)
	}
	if _, _, err := svc.RespondClientInformationInOperatorContext(
		ctx, testOperatorContextID, req.ID, clientID, exchange.ID, requested.Version,
		"A different response must not reuse the idempotency key", mutation,
	); !errors.Is(err, ErrInformationResponseIdempotencyConflict) {
		t.Fatalf("different response with the same idempotency key returned %v, want conflict", err)
	}
}
