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

func TransitionProposalExpected(
	ctx context.Context,
	db *sql.DB,
	actorID, actorRole, id string,
	input ProposalTransitionOCCInput,
) (ProductProposal, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return ProductProposal{}, err
	}
	current, err := GetProposal(ctx, db, id)
	if err != nil {
		return ProductProposal{}, err
	}
	if current.Version != *input.ExpectedVersion {
		return ProductProposal{}, &ConflictError{
			EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
		}
	}
	// TransitionProposal serializes the actual state mutation with SELECT FOR
	// UPDATE and commits the proposal audit event in the same transaction.
	return TransitionProposal(ctx, db, actorID, actorRole, id, input.ProposalTransitionInput)
}

// ProposalDecisionOCCInput keeps the deprecated decision vocabulary safe for
// older clients while enforcing the same revision guard.
type ProposalDecisionOCCInput struct {
	ProposalDecisionInput
	ExpectedVersion *int `json:"expectedVersion"`
}

func DecideProposalExpected(
	ctx context.Context,
	db *sql.DB,
	actorID, actorRole, id string,
	input ProposalDecisionOCCInput,
) (ProductProposal, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return ProductProposal{}, err
	}
	current, err := GetProposal(ctx, db, id)
	if err != nil {
		return ProductProposal{}, err
	}
	if current.Version != *input.ExpectedVersion {
		return ProductProposal{}, &ConflictError{
			EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: current.Version, Message: "version mismatch",
		}
	}
	return DecideProposal(ctx, db, actorID, actorRole, id, input.ProposalDecisionInput)
}
