package wlt

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
)

// FinanceResponseKind describes the JSON value required at a contract's
// authoritative top-level response key.
type FinanceResponseKind string

const (
	FinanceResponseObject FinanceResponseKind = "object"
	FinanceResponseArray  FinanceResponseKind = "array"
)

type FinanceResponseContract struct {
	RequiredKey string
	ValueKind   FinanceResponseKind
	AllowedKeys []string
}

type financePublicError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

var (
	errFinanceResponseContentType = fmt.Errorf("WLT finance response content type is not application/json")
	errFinanceResponseBody        = fmt.Errorf("WLT finance response body violates its operation contract")
)

func validateFinanceResponseContentType(contentType string) error {
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil || mediaType != "application/json" {
		return errFinanceResponseContentType
	}
	return nil
}

func containsScriptLikePayload(body []byte) bool {
	lower := bytes.ToLower(body)
	return bytes.Contains(lower, []byte("<script")) || bytes.Contains(lower, []byte("javascript:"))
}

func validateFinanceSuccessBody(contract FinanceResponseContract, body []byte) error {
	if len(bytes.TrimSpace(body)) == 0 || !json.Valid(body) || containsScriptLikePayload(body) {
		return errFinanceResponseBody
	}
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(body, &envelope); err != nil || envelope == nil {
		return errFinanceResponseBody
	}
	allowed := make(map[string]struct{}, len(contract.AllowedKeys))
	for _, key := range contract.AllowedKeys {
		allowed[key] = struct{}{}
	}
	if _, ok := envelope[contract.RequiredKey]; !ok {
		return errFinanceResponseBody
	}
	for key := range envelope {
		if _, ok := allowed[key]; !ok {
			return errFinanceResponseBody
		}
	}
	value := bytes.TrimSpace(envelope[contract.RequiredKey])
	switch contract.ValueKind {
	case FinanceResponseObject:
		if len(value) == 0 || value[0] != '{' || string(value) == "{}" {
			return errFinanceResponseBody
		}
	case FinanceResponseArray:
		if len(value) == 0 || value[0] != '[' {
			return errFinanceResponseBody
		}
	default:
		return errFinanceResponseBody
	}
	return nil
}

func validateFinanceErrorBody(body []byte) error {
	if len(bytes.TrimSpace(body)) == 0 || !json.Valid(body) || containsScriptLikePayload(body) {
		return errFinanceResponseBody
	}
	var envelope financePublicError
	if err := json.Unmarshal(body, &envelope); err != nil || envelope.Code == "" || envelope.Message == "" {
		return errFinanceResponseBody
	}
	return nil
}

func canonicalFinanceUpstreamError(status int) []byte {
	code := fmt.Sprintf("FINANCE_UPSTREAM_%d", status)
	message := "finance operation was rejected"
	if status >= 500 {
		code = "FINANCE_UPSTREAM_UNAVAILABLE"
		message = "finance service is temporarily unavailable"
	}
	body, _ := json.Marshal(financePublicError{Code: code, Message: message})
	return body
}

// normalizeFinanceResponse is the sole DSH/WLT response boundary. Success
// bodies are contract-checked before release. Upstream error bodies are
// validated as JSON envelopes but never forwarded; 5xx responses become a
// stable 502 public envelope, while expected 4xx semantics retain their
// status with a non-disclosing canonical code.
func normalizeFinanceResponse(op FinanceOperation, status int, contentType string, body []byte) (int, []byte, error) {
	if err := validateFinanceResponseContentType(contentType); err != nil {
		return 0, nil, err
	}
	if status >= 200 && status < 300 {
		if err := validateFinanceSuccessBody(op.ResponseContract, body); err != nil {
			return 0, nil, err
		}
		return status, body, nil
	}
	if status >= 400 && status < 500 {
		if err := validateFinanceErrorBody(body); err != nil {
			return 0, nil, err
		}
		return status, canonicalFinanceUpstreamError(status), nil
	}
	if status >= 500 {
		if err := validateFinanceErrorBody(body); err != nil {
			return 0, nil, err
		}
		return http.StatusBadGateway, canonicalFinanceUpstreamError(status), nil
	}
	return 0, nil, fmt.Errorf("unsupported WLT finance status %d", status)
}
