package http

import (
	stdhttp "net/http"
	"testing"
	"time"

	"dsh-api/internal/dispatch"
)

func TestRegisterDeliveryProofRoutesOwnsActorPaths(t *testing.T) {
	mux := stdhttp.NewServeMux()
	registerDeliveryProofRoutes(mux, &protectedStoreServer{})

	cases := []struct {
		method string
		path   string
	}{
		{method: stdhttp.MethodPost, path: "/dsh/client/orders/00000000-0000-0000-0000-000000000001/delivery-pin"},
		{method: stdhttp.MethodGet, path: "/dsh/client/orders/00000000-0000-0000-0000-000000000001/delivery-proof"},
		{method: stdhttp.MethodPost, path: "/dsh/captain/dispatch/assignments/00000000-0000-0000-0000-000000000002/delivery-proof"},
		{method: stdhttp.MethodGet, path: "/dsh/operator/delivery-proofs"},
		{method: stdhttp.MethodPost, path: "/dsh/operator/delivery-proofs/00000000-0000-0000-0000-000000000003/accept"},
		{method: stdhttp.MethodPost, path: "/dsh/operator/delivery-proofs/00000000-0000-0000-0000-000000000003/reject"},
	}

	for _, test := range cases {
		req, err := stdhttp.NewRequest(test.method, test.path, nil)
		if err != nil {
			t.Fatalf("NewRequest: %v", err)
		}
		_, pattern := mux.Handler(req)
		if pattern == "" {
			t.Fatalf("route not registered: %s %s", test.method, test.path)
		}
	}
}

func TestMarshalClientDeliveryProofRedactsSensitiveEvidence(t *testing.T) {
	capturedAt := time.Date(2026, time.July, 22, 3, 0, 0, 0, time.UTC)
	latitude := 15.3694
	longitude := 44.1910
	proof := &dispatch.DeliveryProof{
		ID:                "proof-id",
		OrderID:           "order-id",
		CaptainID:         "captain-id",
		Method:            dispatch.DeliveryProofComposite,
		Status:            dispatch.DeliveryProofAccepted,
		PhotoMediaRef:     "photo-media-ref",
		SignatureMediaRef: "signature-media-ref",
		CapturedLatitude:  &latitude,
		CapturedLongitude: &longitude,
		CapturedAt:        capturedAt,
		ReviewedByActorID: "operator-id",
		ReviewReason:      "verified by operator",
	}

	out := marshalClientDeliveryProof(proof)
	for _, forbidden := range []string{
		"captainId",
		"photoMediaRef",
		"signatureMediaRef",
		"capturedLatitude",
		"capturedLongitude",
		"reviewedByActorId",
		"reviewReason",
	} {
		if _, exists := out[forbidden]; exists {
			t.Fatalf("client response leaked %s", forbidden)
		}
	}
	if out["hasPhoto"] != true || out["hasSignature"] != true {
		t.Fatal("client response should keep non-sensitive proof presence flags")
	}
}

func TestDeliveryProofCoordinateAndEvidenceNormalization(t *testing.T) {
	if normalizeDeliveryEvidenceKind(" SIGNATURE ") != "signature" {
		t.Fatal("signature evidence must be preserved")
	}
	if normalizeDeliveryEvidenceKind("unknown") != "photo" {
		t.Fatal("unknown evidence must fail closed to photo classification")
	}
	lat, lng, ok := parseDeliveryProofCoordinates("15.3694", "44.1910")
	if !ok || lat == nil || lng == nil || *lat != 15.3694 || *lng != 44.1910 {
		t.Fatal("valid coordinates were not parsed")
	}
	if _, _, ok = parseDeliveryProofCoordinates("15.3694", ""); ok {
		t.Fatal("partial coordinates must be rejected")
	}
}
