package wlt

import "net/http"

const maxFinanceProxyResponseBytes = 4 << 20

func setServiceHeaders(req *http.Request, serviceToken string) {
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+serviceToken)
	req.Header.Set("X-Service-Caller", "dsh")
}
