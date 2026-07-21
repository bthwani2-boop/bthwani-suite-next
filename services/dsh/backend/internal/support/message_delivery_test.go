package support

import (
	"errors"
	"testing"
)

func TestNormalizeSupportAttachmentInput(t *testing.T) {
	input, err := normalizeAttachmentInput(MessageAttachmentInput{
		MediaAssetID: " asset-1 ",
		FileName:     " proof.jpg ",
		MimeType:     " IMAGE/JPEG ",
		SizeBytes:    1024,
	})
	if err != nil {
		t.Fatalf("expected valid attachment: %v", err)
	}
	if input.MediaAssetID != "asset-1" || input.FileName != "proof.jpg" || input.MimeType != "image/jpeg" {
		t.Fatalf("unexpected normalization: %+v", input)
	}
}

func TestNormalizeSupportAttachmentInputRejectsInvalidPayloads(t *testing.T) {
	cases := []MessageAttachmentInput{
		{},
		{MediaAssetID: "asset", FileName: "a.jpg", MimeType: "image/jpeg", SizeBytes: 0},
		{MediaAssetID: "asset", FileName: "a.jpg", MimeType: "image/jpeg", SizeBytes: maxSupportAttachmentBytes + 1},
		{MediaAssetID: "asset", FileName: "", MimeType: "image/jpeg", SizeBytes: 1},
	}
	for _, input := range cases {
		if _, err := normalizeAttachmentInput(input); !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for %+v, got %v", input, err)
		}
	}
}

func TestMessageDeliveryRejectsNilDatabase(t *testing.T) {
	_, err := AttachActorMessageAsset(nil, "captain-1", RoleCaptain, "ticket-1", "message-1", MessageAttachmentInput{
		MediaAssetID: "asset-1", FileName: "proof.jpg", MimeType: "image/jpeg", SizeBytes: 10,
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
	if _, err := MarkActorTicketMessagesRead(nil, "captain-1", RoleCaptain, "ticket-1"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for nil db receipt, got %v", err)
	}
}
