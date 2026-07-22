package http

import "net/http"

// registerDeliveryProofRoutes owns the JRN-018 actor-specific HTTP surface.
// It is invoked from the terminal protected-route registrar so these paths are
// registered exactly once without duplicating the main router constructor.
func registerDeliveryProofRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/client/orders/{orderId}/delivery-pin", s.handleIssueDeliveryPIN)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/delivery-proof", s.handleGetClientDeliveryProof)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/delivery-proof", s.handleSubmitGovernedDeliveryProof)
	mux.HandleFunc("GET /dsh/captain/dispatch/assignments/{assignmentId}/delivery-proof", s.handleGetCaptainDeliveryProof)
	mux.HandleFunc("GET /dsh/operator/delivery-proofs", s.handleListOperatorDeliveryProofs)
	mux.HandleFunc("GET /dsh/operator/delivery-proofs/{proofId}", s.handleGetOperatorDeliveryProof)
	mux.HandleFunc("POST /dsh/operator/delivery-proofs/{proofId}/accept", s.handleAcceptOperatorDeliveryProof)
	mux.HandleFunc("POST /dsh/operator/delivery-proofs/{proofId}/reject", s.handleRejectOperatorDeliveryProof)
}
