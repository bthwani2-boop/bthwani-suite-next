package centralcatalog

// ProposalTransitionInput is the governed transition payload shared by the
// OCC transition endpoint and its compatibility-facing adapter.
type ProposalTransitionInput struct {
	NextStatus             string  `json:"nextStatus"`
	Note                   string  `json:"note"`
	AdoptedMasterProductID *string `json:"adoptedMasterProductId"`
	CreateMasterProduct    *bool   `json:"createMasterProduct"`
	MergeData              *bool   `json:"mergeData"`
}

// ProposalTransitionOCCInput preserves the governed transition payload while
// requiring the revision that the reviewer actually inspected.
type ProposalTransitionOCCInput struct {
	ProposalTransitionInput
	ExpectedVersion *int `json:"expectedVersion"`
}
