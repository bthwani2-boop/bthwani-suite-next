package http

import "net/http"

// registerJRN038CodFinanceRoutes adds only the COD routes that are not already
// registered by the root finance router. WLT remains the source of truth;
// these routes enforce surface identity and proxy governed requests without
// duplicating canonical control-panel route registrations.
func registerJRN038CodFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/partner/me/finance/cod-records", s.handlePartnerFinanceCodRecords)
	mux.HandleFunc("POST /dsh/partner/me/finance/cod-records/{recordId}/remit", s.handlePartnerRemitCod)
}
