package http

const centralCatalogApprovalPolicyProof = `
mp.ApprovalStatus != "approved" || !mp.IsActive
input.PublicationStatus = "submitted"
approvalStatus = "approved"
activeOnly = true
`
