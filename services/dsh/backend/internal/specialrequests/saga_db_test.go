package specialrequests

import (
	"context"
	"errors"
	"testing"
)

func TestStartQuoteSagaExactReplayAndPayloadConflictDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	svc, _ := newTestService(db)
	ctx := context.Background()
	clientID := newClientID(t)
	req, err := svc.CreateInOperatorContext(ctx, testOperatorContextID, clientID, validSheinInput(clientID))
	if err != nil {
		t.Fatalf("create special request: %v", err)
	}
	cleanupRequest(t, db, req.ID)
	commandID := "quote-command-" + testSuffix()
	input := QuoteSagaInput{
		OperatorContextID: testOperatorContextID, SpecialRequestID: req.ID, ClientID: clientID,
		ExpectedVersion: req.Version, CommandID: commandID, PolicyID: "special-request-standard",
		ProposedAmountMinorUnits: 1250, ProposedCurrency: "YER", ProposalReason: "approved quote",
	}
	first, replayed, err := StartQuoteSaga(ctx, db, input)
	if err != nil {
		t.Fatalf("start saga: %v", err)
	}
	if replayed || first.State != SagaRequested {
		t.Fatalf("expected a new requested saga, replayed=%v state=%s", replayed, first.State)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_special_request_sagas WHERE id = $1::uuid`, first.ID)
	})

	replayedSaga, replayed, err := StartQuoteSaga(ctx, db, input)
	if err != nil {
		t.Fatalf("replay saga: %v", err)
	}
	if !replayed || replayedSaga.ID != first.ID {
		t.Fatalf("expected exact replay of saga %s, got %#v replayed=%v", first.ID, replayedSaga, replayed)
	}

	input.ProposedAmountMinorUnits++
	if _, _, err := StartQuoteSaga(ctx, db, input); !errors.Is(err, ErrSagaConflict) {
		t.Fatalf("expected same command with changed payload to fail closed, got %v", err)
	}
}
