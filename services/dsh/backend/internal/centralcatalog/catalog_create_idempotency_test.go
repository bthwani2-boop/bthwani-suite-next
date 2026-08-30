package centralcatalog

import (
	"errors"
	"testing"
)

func TestNewCatalogCreateMutationBindsStableRequestHash(t *testing.T) {
	t.Parallel()
	request := struct {
		StoreID string `json:"storeId"`
		Amount  int    `json:"amount"`
	}{StoreID: "store-1", Amount: 1500}

	first, err := newCatalogCreateMutation("actor-1", "assortment_price.create", "price-create-1", request)
	if err != nil {
		t.Fatalf("first mutation: %v", err)
	}
	second, err := newCatalogCreateMutation("actor-1", "assortment_price.create", "price-create-1", request)
	if err != nil {
		t.Fatalf("second mutation: %v", err)
	}
	if first.RequestHash != second.RequestHash {
		t.Fatalf("same request must have stable hash: %q != %q", first.RequestHash, second.RequestHash)
	}

	different, err := newCatalogCreateMutation("actor-1", "assortment_price.create", "price-create-1", struct {
		StoreID string `json:"storeId"`
		Amount  int    `json:"amount"`
	}{StoreID: "store-1", Amount: 1600})
	if err != nil {
		t.Fatalf("different mutation: %v", err)
	}
	if first.RequestHash == different.RequestHash {
		t.Fatal("different catalog inputs must not share a request hash")
	}
}

func TestNewCatalogCreateMutationRequiresBoundedIdentity(t *testing.T) {
	t.Parallel()
	for _, key := range []string{"", "short"} {
		_, err := newCatalogCreateMutation("actor-1", "catalog_asset.create", key, map[string]string{"file": "a.jpg"})
		if !errors.Is(err, ErrIdempotencyRequired) {
			t.Fatalf("key %q: expected ErrIdempotencyRequired, got %v", key, err)
		}
	}
}

func TestValidIntendedAssetTargetAllowsUnboundReelPoster(t *testing.T) {
	role := "reel_poster"
	if !validIntendedAssetTarget(nil, nil, &role) {
		t.Fatal("reel posters are intentionally bound by dsh_reels after upload")
	}
	videoRole := "reel_video"
	if validIntendedAssetTarget(nil, nil, &videoRole) {
		t.Fatal("unbound reel videos must not bypass an intended entity")
	}
}
