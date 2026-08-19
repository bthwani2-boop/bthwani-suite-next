package centralcatalog

// ProposalTransitionOCCInput preserves the governed transition payload while
// requiring the revision that the reviewer actually inspected.
type ProposalTransitionOCCInput struct {
	ProposalTransitionInput
	ExpectedVersion *int `json:"expectedVersion"`
}
