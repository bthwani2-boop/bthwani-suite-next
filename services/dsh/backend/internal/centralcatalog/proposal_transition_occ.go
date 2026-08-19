package centralcatalog

// ProposalTransitionOCCInput preserves the governed transition payload while
// requiring the revision that the reviewer actually inspected.
type ProposalTransitionOCCInput struct {
	ProposalTransitionInput
	ExpectedVersion *int `json:"expectedVersion"`
}

// ProposalDecisionOCCInput keeps the deprecated decision vocabulary safe for
// older clients while enforcing the same revision guard during cutover.
type ProposalDecisionOCCInput struct {
	ProposalDecisionInput
	ExpectedVersion *int `json:"expectedVersion"`
}
