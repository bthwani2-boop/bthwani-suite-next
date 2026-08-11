package centralcatalog

import (
	"context"
	"database/sql"
)

// ProposalTransitionOCCInput preserves the governed transition payload while
// requiring the revision that the reviewer actually inspected.
type ProposalTransitionOCCInput struct {
	ProposalTransitionInput
	ExpectedVersion *int `json:"expectedVersion"`
}

// TransitionProposalExpected is retained as the compatibility entry point for
// older callers, but it has no independent version precheck or state machine.
// The expected version is verified only after SELECT ... FOR UPDATE inside the
// canonical atomic transition, eliminating the previous TOCTOU window.
func TransitionProposalExpected(
	ctx context.Context,
	db *sql.DB,
	actorID, actorRole, id string,
	input ProposalTransitionOCCInput,
) (ProductProposal, error) {
	return TransitionProposalAtomicExpected(ctx, db, actorID, actorRole, id, input)
}

// ProposalDecisionOCCInput keeps the deprecated decision vocabulary safe for
// older clients while enforcing the same revision guard.
type ProposalDecisionOCCInput struct {
	ProposalDecisionInput
	ExpectedVersion *int `json:"expectedVersion"`
}

// DecideProposalExpected is likewise a compatibility alias for the canonical
// atomic decision path. No legacy state-machine implementation is reachable
// through this OCC surface.
func DecideProposalExpected(
	ctx context.Context,
	db *sql.DB,
	actorID, actorRole, id string,
	input ProposalDecisionOCCInput,
) (ProductProposal, error) {
	return DecideProposalAtomicExpected(ctx, db, actorID, actorRole, id, input)
}
