package support

import "testing"

func duration(value int64) *int64 { return &value }

func validRichAttachment() RichMessageAttachmentInput {
	return RichMessageAttachmentInput{
		MediaAssetID: "asset-audio-001",
		FileName:     "voice-message.m4a",
		MimeType:     "audio/mp4",
		SizeBytes:    1024,
		Kind:         "audio",
		DurationMs:   duration(2500),
		UploadStatus: "ready",
	}
}

func TestNormalizeRichMessageAcceptsBodyOnly(t *testing.T) {
	input, _, _, err := normalizeRichMessageInput(RichMessageInput{
		ActorID:        "client-1",
		TicketID:       "ticket-1",
		Body:           "Need help",
		IdempotencyKey: "idem-1",
		CorrelationID:  "corr-1",
	})
	if err != nil {
		t.Fatalf("expected body-only message to be valid: %v", err)
	}
	if input.Body != "Need help" || len(input.Attachments) != 0 {
		t.Fatalf("unexpected normalized message: %#v", input)
	}
}

func TestNormalizeRichMessageAcceptsAttachmentOnly(t *testing.T) {
	input, _, _, err := normalizeRichMessageInput(RichMessageInput{
		ActorID:        "client-1",
		TicketID:       "ticket-1",
		Attachments:    []RichMessageAttachmentInput{validRichAttachment()},
		IdempotencyKey: "idem-2",
		CorrelationID:  "corr-2",
	})
	if err != nil {
		t.Fatalf("expected attachment-only message to be valid: %v", err)
	}
	if input.Body != "" || len(input.Attachments) != 1 {
		t.Fatalf("unexpected normalized message: %#v", input)
	}
}

func TestNormalizeRichMessageRejectsEmptyContent(t *testing.T) {
	_, _, _, err := normalizeRichMessageInput(RichMessageInput{
		ActorID:        "client-1",
		TicketID:       "ticket-1",
		IdempotencyKey: "idem-3",
		CorrelationID:  "corr-3",
	})
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}

func TestNormalizeRichAttachmentRequiresDurationForAudioAndVideo(t *testing.T) {
	for _, kind := range []string{"audio", "video"} {
		input := validRichAttachment()
		input.Kind = kind
		input.MimeType = kind + "/mp4"
		input.DurationMs = nil
		if _, err := normalizeRichAttachment(input); err != ErrInvalid {
			t.Fatalf("expected %s without duration to fail, got %v", kind, err)
		}
	}
}

func TestNormalizeRichAttachmentRejectsOversizeAsset(t *testing.T) {
	input := validRichAttachment()
	input.SizeBytes = maxRichSupportAttachmentBytes + 1
	if _, err := normalizeRichAttachment(input); err != ErrInvalid {
		t.Fatalf("expected oversize asset to fail, got %v", err)
	}
}

func TestNormalizeRichMessageRejectsDuplicateAssetReferences(t *testing.T) {
	attachment := validRichAttachment()
	_, _, _, err := normalizeRichMessageInput(RichMessageInput{
		ActorID:        "client-1",
		TicketID:       "ticket-1",
		Attachments:    []RichMessageAttachmentInput{attachment, attachment},
		IdempotencyKey: "idem-4",
		CorrelationID:  "corr-4",
	})
	if err != ErrInvalid {
		t.Fatalf("expected duplicate asset references to fail, got %v", err)
	}
}
