# Pipeline & Proposals Gate

- Transition proposal pipeline implemented in backend: `TransitionProposal` in `centralcatalog.go`.
- Deprecated legacy `DecideProposal` replaced by full multi-stage state machine transitions.
- Every state transition writes an audit row to `dsh_product_proposal_audit`.
- Proposal sub-tabs by pipeline status, transition buttons, and review notes mapped on the frontend.
