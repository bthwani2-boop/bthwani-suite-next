package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const (
	defaultBaseURL   = "http://localhost:58080"
	defaultOutputDir = "../../evidence/GUARDS-SOVEREIGN-UNIFIED-FULLSTACK-BRAIN/runtime-smoke"
)

type stepResult struct {
	Name       string `json:"name"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	StatusCode int    `json:"statusCode"`
	Passed     bool   `json:"passed"`
	Gap        string `json:"gap,omitempty"`
	Body       any    `json:"body,omitempty"`
}

func main() {
	baseURL := getenv("DSH_API_BASE_URL", defaultBaseURL)
	outputDir := getenv("DSH_API_EVIDENCE_DIR", defaultOutputDir)

	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		fail("prepare-output", fmt.Errorf("failed to create evidence output dir: %w", err))
	}

	results := []stepResult{
		callAPI(baseURL, "health", http.MethodGet, "/health", "", "", nil),
		callAPI(baseURL, "readiness", http.MethodGet, "/readiness", "", "", nil),
		callAPI(baseURL, "field-create-partner-draft", http.MethodPost, "/dsh/field/partners/drafts", "act_field_99", "app-field", map[string]any{
			"legalNameAr":         "مؤسسة تحقق الشريك",
			"legalNameEn":         "Partner Verification Seed",
			"displayName":         "متجر تحقق الشريك",
			"legalIdentityType":   "commercial_register",
			"legalIdentityNumber": fmt.Sprintf("CR%d", time.Now().Unix()),
			"ownerName":           "مندوب التحقق",
			"primaryPhone":        "+966500000001",
			"email":               "verify-partner@example.test",
			"category":            "restaurant",
			"notes":               "API-only verification draft",
		}),
	}

	storeCreate := callAPI(baseURL, "partner-store-create-api", http.MethodPost, "/dsh/partner/stores", "act_partner_99", "app-partner", map[string]any{
		"displayName": "متجر تحقق الشريك",
		"cityCode":    "riyadh",
	})
	if storeCreate.StatusCode == http.StatusNotFound || storeCreate.StatusCode == http.StatusMethodNotAllowed {
		storeCreate.Passed = false
		storeCreate.Gap = "missing API endpoint for partner store creation/visibility transition"
	}
	results = append(results, storeCreate)

	passed := true
	for _, result := range results {
		if !result.Passed {
			passed = false
			break
		}
	}

	writeJSON(filepath.Join(outputDir, "verify-partner-onboarding-api.json"), map[string]any{
		"runner":    "verify_partner_onboarding_api",
		"apiOnly":   true,
		"dbWrites":  "seed/reset only; none performed by this runner",
		"baseURL":   baseURL,
		"passed":    passed,
		"results":   results,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})

	if !passed {
		fmt.Fprintln(os.Stderr, "RESULT: FIX_REQUIRED")
		for _, result := range results {
			if !result.Passed {
				fmt.Fprintf(os.Stderr, "GAP: %s: %s\n", result.Name, result.Gap)
			}
		}
		os.Exit(1)
	}

	fmt.Fprintln(os.Stdout, "RESULT: PASS")
}

func callAPI(baseURL, name, method, path, actorID, surface string, body any) stepResult {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return stepResult{Name: name, Method: method, Path: path, Passed: false, Gap: err.Error()}
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, baseURL+path, reader)
	if err != nil {
		return stepResult{Name: name, Method: method, Path: path, Passed: false, Gap: err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-ID", "corr_verify_partner_onboarding_api")
	req.Header.Set("Idempotency-Key", "idem_verify_partner_onboarding_api_"+name)
	if actorID != "" {
		req.Header.Set("X-Actor-ID", actorID)
	}
	if surface != "" {
		req.Header.Set("X-Actor-Surface", surface)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return stepResult{Name: name, Method: method, Path: path, Passed: false, Gap: err.Error()}
	}
	defer resp.Body.Close()

	var decoded any
	_ = json.NewDecoder(resp.Body).Decode(&decoded)
	return stepResult{
		Name:       name,
		Method:     method,
		Path:       path,
		StatusCode: resp.StatusCode,
		Passed:     resp.StatusCode >= 200 && resp.StatusCode < 300,
		Body:       decoded,
	}
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func writeJSON(path string, value any) {
	payload, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		fail("write-json", err)
	}
	if err := os.WriteFile(path, payload, 0o644); err != nil {
		fail("write-json", err)
	}
}

func fail(step string, err error) {
	fmt.Fprintf(os.Stderr, "%s: %v\n", step, err)
	os.Exit(1)
}
