package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/support"
)

type supportAttachmentRequest struct {
	MediaAssetID          string `json:"mediaAssetId"`
	FileName              string `json:"fileName"`
	MimeType              string `json:"mimeType"`
	SizeBytes             int64  `json:"sizeBytes"`
	Kind                  string `json:"kind"`
	DurationMs            *int64 `json:"durationMs"`
	ThumbnailMediaAssetID string `json:"thumbnailMediaAssetId"`
	WaveformRef           string `json:"waveformRef"`
	UploadStatus          string `json:"uploadStatus"`
}

type richSupportMessageRequest struct {
	Body        string                     `json:"body"`
	IsInternal  bool                       `json:"isInternal"`
	Attachments []supportAttachmentRequest `json:"attachments"`
}

func decodeRichSupportMessageRequest(
	w http.ResponseWriter,
	r *http.Request,
	allowInternal bool,
) (support.RichMessageInput, bool) {
	var body richSupportMessageRequest
	if !decodeProtectedJSON(w, r, &body) {
		return support.RichMessageInput{}, false
	}
	attachments := make([]support.RichMessageAttachmentInput, 0, len(body.Attachments))
	for _, item := range body.Attachments {
		attachments = append(attachments, support.RichMessageAttachmentInput{
			MediaAssetID:          item.MediaAssetID,
			FileName:              item.FileName,
			MimeType:              item.MimeType,
			SizeBytes:             item.SizeBytes,
			Kind:                  item.Kind,
			DurationMs:            item.DurationMs,
			ThumbnailMediaAssetID: item.ThumbnailMediaAssetID,
			WaveformRef:           item.WaveformRef,
			UploadStatus:          item.UploadStatus,
		})
	}
	return support.RichMessageInput{
		Body:        strings.TrimSpace(body.Body),
		IsInternal:  allowInternal && body.IsInternal,
		Attachments: attachments,
	}, true
}

func marshalRichMessage(value support.RichMessage) map[string]any {
	message := marshalMessage(value.Message)
	attachments := value.Attachments
	if attachments == nil {
		attachments = []support.RichMessageAttachment{}
	}
	message["attachments"] = attachments
	return message
}
