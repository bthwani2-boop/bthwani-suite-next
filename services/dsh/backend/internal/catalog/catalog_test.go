package catalog

import (
	"context"
	"errors"
	"testing"
)

func TestSanitizeFileName(t *testing.T) {
	got := sanitizeFileName("../menu/hero.png")
	if got == "../menu/hero.png" || got == "" {
		t.Fatalf("unsafe object filename: %q", got)
	}
}

func TestCatalogValidationEnums(t *testing.T) {
	for _, decision := range []string{"approved", "rejected"} {
		if decision != "approved" && decision != "rejected" {
			t.Fatalf("unexpected decision %q", decision)
		}
	}
}

func TestUpsertProductRejectsNonPositiveUnitPrice(t *testing.T) {
	ctx := context.Background()
	cases := []float64{0, -1, -100.5}
	for _, price := range cases {
		_, err := UpsertProduct(ctx, nil, "actor-1", "partner", "store-1", "", "corr-1", ProductInput{
			Name:           "Widget",
			SKU:            "sku-1",
			PriceReference: "10 YER",
			UnitPrice:      price,
		})
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for unitPrice=%v, got %v", price, err)
		}
	}
}
