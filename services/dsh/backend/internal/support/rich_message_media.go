package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

const (
	maxRichSupportAttachmentBytes int64 = 100 * 1024 * 1024
	maxRichSupportAttachments           = 10
)

type RichMessageAttachmentInput struct {
	MediaAssetID         string
	FileName             string
	MimeType             string
	SizeBytes            int64
	Kind                 string
	DurationMs           *int64
	ThumbnailMediaAssetID string
	WaveformRef          string
	UploadStatus         string
}

type RichMessageAttachment struct {
	ID                    string    `json:"id"`
	TicketID              string    `json:"ticketId"`
	MessageID             string    `json:"messageId"`
	MediaAssetID          string    `json:"mediaAssetId"`
	FileName              string    `json:"fileName"`
	MimeType              string    `json:"mimeType"`
	SizeBytes             int64     `json:"sizeBytes"`
	Kind                  string    `json:"kind"`
	DurationMs            *int64    `json:"durationMs,omitempty"`
	ThumbnailMediaAssetID string    `json:"thumbnailMediaAssetId,omitempty"`
	WaveformRef           string    `json:"waveformRef,omitempty"`
	UploadStatus          string    `json:"uploadStatus"`
	AttachedBy            string    `json:"attachedBy"`
	IsInternal            bool      `json:"isInternal"`
	CreatedAt             time.Time `json:"createdAt"`
}

type RichMessage struct {
	Message     Message
	Attachments []RichMessageAttachment
}

type RichMessageInput struct {
	ActorID        string
	TicketID       string
	Body           string
	IsInternal     bool
	Attachments    []RichMessageAttachmentInput
	IdempotencyKey string
	CorrelationID  string
}

func normalizeRichAttachment(input RichMessageAttachmentInput) (RichMessageAttachmentInput, error) {
	input.MediaAssetID = strings.TrimSpace(input.MediaAssetID)
	input.FileName = strings.TrimSpace(input.FileName)
	input.MimeType = strings.ToLower(strings.TrimSpace(input.MimeType))
	input.Kind = strings.ToLower(strings.TrimSpace(input.Kind))
	input.ThumbnailMediaAssetID = strings.TrimSpace(input.ThumbnailMediaAssetID)
	input.WaveformRef = strings.TrimSpace(input.WaveformRef)
	input.UploadStatus = strings.ToLower(strings.TrimSpace(input.UploadStatus))
	if input.UploadStatus == "" {
		input.UploadStatus = "ready"
	}
	if input.Kind == "" {
		switch {
		case strings.HasPrefix(input.MimeType, "image/"):
			input.Kind = "image"
		case strings.HasPrefix(input.MimeType, "audio/"):
			input.Kind = "audio"
		case strings.HasPrefix(input.MimeType, "video/"):
			input.Kind = "video"
		default:
			input.Kind = "document"
		}
	}
	if input.MediaAssetID == "" || input.FileName == "" || input.MimeType == "" ||
		len(input.MediaAssetID) > 240 || len(input.FileName) > 240 || len(input.MimeType) > 160 ||
		input.SizeBytes <= 0 || input.SizeBytes > maxRichSupportAttachmentBytes {
		return RichMessageAttachmentInput{}, ErrInvalid
	}
	switch input.Kind {
	case "image", "audio", "video", "document":
	default:
		return RichMessageAttachmentInput{}, ErrInvalid
	}
	switch input.UploadStatus {
	case "uploaded", "processing", "ready", "failed":
	default:
		return RichMessageAttachmentInput{}, ErrInvalid
	}
	if input.DurationMs != nil && *input.DurationMs < 0 {
		return RichMessageAttachmentInput{}, ErrInvalid
	}
	if (input.Kind == "audio" || input.Kind == "video") && input.DurationMs == nil {
		return RichMessageAttachmentInput{}, ErrInvalid
	}
	return input, nil
}

func normalizeRichMessageInput(input RichMessageInput) (RichMessageInput, string, string, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.TicketID = strings.TrimSpace(input.TicketID)
	input.Body = strings.TrimSpace(input.Body)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.TicketID == "" || len(input.Body) > 4000 ||
		(input.Body == "" && len(input.Attachments) == 0) || len(input.Attachments) > maxRichSupportAttachments {
		return RichMessageInput{}, "", "", ErrInvalid
	}
	seen := make(map[string]struct{}, len(input.Attachments))
	for index, attachment := range input.Attachments {
		normalized, normalizeErr := normalizeRichAttachment(attachment)
		if normalizeErr != nil {
			return RichMessageInput{}, "", "", normalizeErr
		}
		if _, duplicate := seen[normalized.MediaAssetID]; duplicate {
			return RichMessageInput{}, "", "", ErrInvalid
		}
		seen[normalized.MediaAssetID] = struct{}{}
		input.Attachments[index] = normalized
	}
	return input, idempotencyKey, correlationID, nil
}

func scanRichAttachment(row interface{ Scan(dest ...any) error }) (RichMessageAttachment, error) {
	var item RichMessageAttachment
	var duration sql.NullInt64
	var thumbnail, waveform sql.NullString
	err := row.Scan(
		&item.ID, &item.TicketID, &item.MessageID, &item.MediaAssetID, &item.FileName,
		&item.MimeType, &item.SizeBytes, &item.Kind, &duration, &thumbnail, &waveform,
		&item.UploadStatus, &item.AttachedBy, &item.IsInternal, &item.CreatedAt,
	)
	if duration.Valid {
		value := duration.Int64
		item.DurationMs = &value
	}
	if thumbnail.Valid {
		item.ThumbnailMediaAssetID = thumbnail.String
	}
	if waveform.Valid {
		item.WaveformRef = waveform.String
	}
	return item, err
}

func listRichAttachmentsTx(tx *sql.Tx, ticketID string, includeInternal bool) (map[string][]RichMessageAttachment, error) {
	rows, err := tx.Query(`
		SELECT id::text, ticket_id::text, message_id::text, media_asset_id, file_name,
		       mime_type, size_bytes, kind, duration_ms, thumbnail_media_asset_id,
		       waveform_ref, upload_status, attached_by, is_internal, created_at
		FROM dsh_support_message_attachments
		WHERE ticket_id = $1::uuid AND ($2::boolean = TRUE OR is_internal = FALSE)
		ORDER BY created_at, id`, ticketID, includeInternal)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := map[string][]RichMessageAttachment{}
	for rows.Next() {
		item, scanErr := scanRichAttachment(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result[item.MessageID] = append(result[item.MessageID], item)
	}
	return result, rows.Err()
}

func insertRichAttachmentsTx(
	tx *sql.Tx,
	message Message,
	actorID string,
	inputs []RichMessageAttachmentInput,
) ([]RichMessageAttachment, error) {
	items := make([]RichMessageAttachment, 0, len(inputs))
	for _, input := range inputs {
		item, err := scanRichAttachment(tx.QueryRow(`
			INSERT INTO dsh_support_message_attachments (
				ticket_id, message_id, media_asset_id, file_name, mime_type, size_bytes,
				kind, duration_ms, thumbnail_media_asset_id, waveform_ref, upload_status,
				attached_by, is_internal
			) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, NULLIF($9,''), NULLIF($10,''), $11, $12, $13)
			ON CONFLICT (message_id, media_asset_id) DO UPDATE
			SET file_name = EXCLUDED.file_name,
			    mime_type = EXCLUDED.mime_type,
			    size_bytes = EXCLUDED.size_bytes,
			    kind = EXCLUDED.kind,
			    duration_ms = EXCLUDED.duration_ms,
			    thumbnail_media_asset_id = EXCLUDED.thumbnail_media_asset_id,
			    waveform_ref = EXCLUDED.waveform_ref,
			    upload_status = EXCLUDED.upload_status,
			    is_internal = EXCLUDED.is_internal
			WHERE dsh_support_message_attachments.attached_by = EXCLUDED.attached_by
			RETURNING id::text, ticket_id::text, message_id::text, media_asset_id, file_name,
			          mime_type, size_bytes, kind, duration_ms, thumbnail_media_asset_id,
			          waveform_ref, upload_status, attached_by, is_internal, created_at`,
			message.TicketID, message.ID, input.MediaAssetID, input.FileName, input.MimeType,
			input.SizeBytes, input.Kind, input.DurationMs, input.ThumbnailMediaAssetID,
			input.WaveformRef, input.UploadStatus, actorID, message.IsInternal,
		))
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrConflict
		}
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func addRichMessage(
	db *sql.DB,
	input RichMessageInput,
	ownerRole ReporterRole,
	senderRole string,
	operatorWide bool,
) (RichMessage, error) {
	var err error
	input, idempotencyKey, correlationID, err := normalizeRichMessageInput(input)
	if err != nil || (!operatorWide && !validReporterRole(ownerRole)) {
		return RichMessage{}, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return RichMessage{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return RichMessage{}, err
	}
	var reporterID string
	if operatorWide {
		err = tx.QueryRow(`SELECT reporter_id FROM dsh_support_tickets WHERE id = $1::uuid FOR UPDATE`, input.TicketID).Scan(&reporterID)
	} else {
		err = tx.QueryRow(`
			SELECT reporter_id FROM dsh_support_tickets
			WHERE id = $1::uuid AND reporter_id = $2 AND reporter_role = $3
			FOR UPDATE`, input.TicketID, input.ActorID, ownerRole).Scan(&reporterID)
	}
	if errors.Is(err, sql.ErrNoRows) {
		return RichMessage{}, ErrNotFound
	}
	if err != nil {
		return RichMessage{}, err
	}

	var message Message
	err = tx.QueryRow(`
		SELECT id::text, ticket_id::text, sender_id, sender_role, body, is_internal, created_at
		FROM dsh_support_messages
		WHERE ticket_id = $1::uuid AND sender_id = $2 AND create_idempotency_key = $3`,
		input.TicketID, input.ActorID, idempotencyKey,
	).Scan(&message.ID, &message.TicketID, &message.SenderID, &message.SenderRole, &message.Body, &message.IsInternal, &message.CreatedAt)
	if err == nil {
		attachmentsByMessage, listErr := listRichAttachmentsTx(tx, input.TicketID, operatorWide)
		if listErr != nil {
			return RichMessage{}, listErr
		}
		if commitErr := tx.Commit(); commitErr != nil {
			return RichMessage{}, commitErr
		}
		return RichMessage{Message: message, Attachments: attachmentsByMessage[message.ID]}, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return RichMessage{}, err
	}

	err = tx.QueryRow(`
		INSERT INTO dsh_support_messages (
			ticket_id, sender_id, sender_role, body, is_internal,
			create_idempotency_key, correlation_id
		) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, ticket_id::text, sender_id, sender_role, body, is_internal, created_at`,
		input.TicketID, input.ActorID, senderRole, input.Body, input.IsInternal && operatorWide,
		idempotencyKey, correlationID,
	).Scan(&message.ID, &message.TicketID, &message.SenderID, &message.SenderRole, &message.Body, &message.IsInternal, &message.CreatedAt)
	if err != nil {
		return RichMessage{}, err
	}
	attachments, err := insertRichAttachmentsTx(tx, message, input.ActorID, input.Attachments)
	if err != nil {
		return RichMessage{}, err
	}
	if err := writeTicketEventTx(tx, input.TicketID, reporterID, input.ActorID, senderRole, "message_added", correlationID); err != nil {
		return RichMessage{}, err
	}
	if err := tx.Commit(); err != nil {
		return RichMessage{}, err
	}
	return RichMessage{Message: message, Attachments: attachments}, nil
}

func AddActorRichMessage(db *sql.DB, actorID string, role ReporterRole, input RichMessageInput) (RichMessage, error) {
	input.ActorID = actorID
	input.IsInternal = false
	return addRichMessage(db, input, role, string(role), false)
}

func AddOperatorRichMessage(db *sql.DB, actorID string, input RichMessageInput) (RichMessage, error) {
	input.ActorID = actorID
	return addRichMessage(db, input, RoleOperator, string(RoleOperator), true)
}

func listRichMessages(
	db *sql.DB,
	actorID string,
	role ReporterRole,
	ticketID string,
	operatorWide bool,
) ([]RichMessage, error) {
	actorID = strings.TrimSpace(actorID)
	ticketID = strings.TrimSpace(ticketID)
	if actorID == "" || ticketID == "" || (!operatorWide && !validReporterRole(role)) {
		return nil, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var exists bool
	if operatorWide {
		err = tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM dsh_support_tickets WHERE id = $1::uuid)`, ticketID).Scan(&exists)
	} else {
		err = tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM dsh_support_tickets
				WHERE id = $1::uuid AND reporter_id = $2 AND reporter_role = $3
			)`, ticketID, actorID, role).Scan(&exists)
	}
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}
	rows, err := tx.Query(`
		SELECT id::text, ticket_id::text, sender_id, sender_role, body, is_internal, created_at
		FROM dsh_support_messages
		WHERE ticket_id = $1::uuid AND ($2::boolean = TRUE OR is_internal = FALSE)
		ORDER BY created_at, id`, ticketID, operatorWide)
	if err != nil {
		return nil, err
	}
	messages := make([]RichMessage, 0)
	for rows.Next() {
		var message Message
		if scanErr := rows.Scan(&message.ID, &message.TicketID, &message.SenderID, &message.SenderRole, &message.Body, &message.IsInternal, &message.CreatedAt); scanErr != nil {
			rows.Close()
			return nil, scanErr
		}
		messages = append(messages, RichMessage{Message: message, Attachments: []RichMessageAttachment{}})
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	attachmentsByMessage, err := listRichAttachmentsTx(tx, ticketID, operatorWide)
	if err != nil {
		return nil, err
	}
	for index := range messages {
		messages[index].Attachments = attachmentsByMessage[messages[index].Message.ID]
		if messages[index].Attachments == nil {
			messages[index].Attachments = []RichMessageAttachment{}
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return messages, nil
}

func ListActorRichMessages(db *sql.DB, actorID string, role ReporterRole, ticketID string) ([]RichMessage, error) {
	return listRichMessages(db, actorID, role, ticketID, false)
}

func ListOperatorRichMessages(db *sql.DB, actorID string, ticketID string) ([]RichMessage, error) {
	return listRichMessages(db, actorID, RoleOperator, ticketID, true)
}
