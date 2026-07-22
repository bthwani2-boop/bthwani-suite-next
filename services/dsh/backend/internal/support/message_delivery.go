package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

const maxSupportAttachmentBytes int64 = 25 * 1024 * 1024

type MessageAttachmentInput struct {
	MediaAssetID string
	FileName     string
	MimeType     string
	SizeBytes    int64
	IsInternal   bool
}

type MessageAttachment struct {
	ID           string    `json:"id"`
	TicketID     string    `json:"ticketId"`
	MessageID    string    `json:"messageId"`
	MediaAssetID string    `json:"mediaAssetId"`
	FileName     string    `json:"fileName"`
	MimeType     string    `json:"mimeType"`
	SizeBytes    int64     `json:"sizeBytes"`
	AttachedBy   string    `json:"attachedBy"`
	IsInternal   bool      `json:"isInternal"`
	CreatedAt    time.Time `json:"createdAt"`
}

type MessageReadSummary struct {
	TicketID    string    `json:"ticketId"`
	ActorID     string    `json:"actorId"`
	ActorRole   string    `json:"actorRole"`
	MarkedCount int64     `json:"markedCount"`
	ReadAt      time.Time `json:"readAt"`
}

func normalizeAttachmentInput(input MessageAttachmentInput) (MessageAttachmentInput, error) {
	input.MediaAssetID = strings.TrimSpace(input.MediaAssetID)
	input.FileName = strings.TrimSpace(input.FileName)
	input.MimeType = strings.ToLower(strings.TrimSpace(input.MimeType))
	if input.MediaAssetID == "" || input.FileName == "" || input.MimeType == "" ||
		len(input.MediaAssetID) > 240 || len(input.FileName) > 240 || len(input.MimeType) > 160 ||
		input.SizeBytes <= 0 || input.SizeBytes > maxSupportAttachmentBytes {
		return MessageAttachmentInput{}, ErrInvalid
	}
	return input, nil
}

func resolveMessageScopeTx(
	tx *sql.Tx,
	actorID string,
	role ReporterRole,
	ticketID string,
	messageID string,
	operatorWide bool,
) (bool, error) {
	actorID = strings.TrimSpace(actorID)
	ticketID = strings.TrimSpace(ticketID)
	messageID = strings.TrimSpace(messageID)
	if actorID == "" || ticketID == "" || messageID == "" || !validReporterRole(role) {
		return false, ErrInvalid
	}
	var internal bool
	err := tx.QueryRow(`
		SELECT m.is_internal
		FROM dsh_support_messages m
		JOIN dsh_support_tickets t ON t.id = m.ticket_id
		WHERE t.id = $1::uuid
		  AND m.id = $2::uuid
		  AND (
		        $3::boolean = TRUE
		        OR (t.reporter_id = $4 AND t.reporter_role = $5 AND m.is_internal = FALSE)
		      )
		FOR SHARE OF t, m`, ticketID, messageID, operatorWide, actorID, string(role)).Scan(&internal)
	if errors.Is(err, sql.ErrNoRows) {
		return false, ErrNotFound
	}
	return internal, err
}

func scanMessageAttachment(row interface{ Scan(dest ...any) error }) (MessageAttachment, error) {
	var item MessageAttachment
	err := row.Scan(
		&item.ID,
		&item.TicketID,
		&item.MessageID,
		&item.MediaAssetID,
		&item.FileName,
		&item.MimeType,
		&item.SizeBytes,
		&item.AttachedBy,
		&item.IsInternal,
		&item.CreatedAt,
	)
	return item, err
}

func attachMessageAsset(
	db *sql.DB,
	actorID string,
	role ReporterRole,
	ticketID string,
	messageID string,
	input MessageAttachmentInput,
	operatorWide bool,
) (MessageAttachment, error) {
	if db == nil {
		return MessageAttachment{}, ErrInvalid
	}
	var err error
	input, err = normalizeAttachmentInput(input)
	if err != nil {
		return MessageAttachment{}, err
	}
	actorID = strings.TrimSpace(actorID)
	ticketID = strings.TrimSpace(ticketID)
	messageID = strings.TrimSpace(messageID)

	tx, err := db.Begin()
	if err != nil {
		return MessageAttachment{}, err
	}
	defer tx.Rollback()
	messageInternal, err := resolveMessageScopeTx(tx, actorID, role, ticketID, messageID, operatorWide)
	if err != nil {
		return MessageAttachment{}, err
	}
	if input.IsInternal && !operatorWide {
		return MessageAttachment{}, ErrForbidden
	}
	if messageInternal && !operatorWide {
		return MessageAttachment{}, ErrForbidden
	}

	item, err := scanMessageAttachment(tx.QueryRow(`
		INSERT INTO dsh_support_message_attachments (
			ticket_id, message_id, media_asset_id, file_name, mime_type,
			size_bytes, attached_by, is_internal
		) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (message_id, media_asset_id) DO UPDATE
		SET file_name = EXCLUDED.file_name,
		    mime_type = EXCLUDED.mime_type,
		    size_bytes = EXCLUDED.size_bytes,
		    is_internal = EXCLUDED.is_internal
		WHERE dsh_support_message_attachments.attached_by = EXCLUDED.attached_by
		RETURNING id::text, ticket_id::text, message_id::text, media_asset_id,
		          file_name, mime_type, size_bytes, attached_by, is_internal, created_at`,
		ticketID, messageID, input.MediaAssetID, input.FileName, input.MimeType,
		input.SizeBytes, actorID, input.IsInternal || messageInternal,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return MessageAttachment{}, ErrConflict
	}
	if err != nil {
		return MessageAttachment{}, err
	}
	if err := tx.Commit(); err != nil {
		return MessageAttachment{}, err
	}
	return item, nil
}

func AttachActorMessageAsset(
	db *sql.DB,
	actorID string,
	role ReporterRole,
	ticketID string,
	messageID string,
	input MessageAttachmentInput,
) (MessageAttachment, error) {
	return attachMessageAsset(db, actorID, role, ticketID, messageID, input, false)
}

func AttachOperatorMessageAsset(
	db *sql.DB,
	actorID string,
	ticketID string,
	messageID string,
	input MessageAttachmentInput,
) (MessageAttachment, error) {
	return attachMessageAsset(db, actorID, RoleOperator, ticketID, messageID, input, true)
}

func listMessageAttachments(
	db *sql.DB,
	actorID string,
	role ReporterRole,
	ticketID string,
	messageID string,
	operatorWide bool,
) ([]MessageAttachment, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err := resolveMessageScopeTx(tx, actorID, role, ticketID, messageID, operatorWide); err != nil {
		return nil, err
	}
	rows, err := tx.Query(`
		SELECT id::text, ticket_id::text, message_id::text, media_asset_id,
		       file_name, mime_type, size_bytes, attached_by, is_internal, created_at
		FROM dsh_support_message_attachments
		WHERE ticket_id = $1::uuid AND message_id = $2::uuid
		  AND ($3::boolean = TRUE OR is_internal = FALSE)
		ORDER BY created_at, id`, ticketID, messageID, operatorWide)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]MessageAttachment, 0)
	for rows.Next() {
		item, scanErr := scanMessageAttachment(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return items, nil
}

func ListActorMessageAttachments(
	db *sql.DB,
	actorID string,
	role ReporterRole,
	ticketID string,
	messageID string,
) ([]MessageAttachment, error) {
	return listMessageAttachments(db, actorID, role, ticketID, messageID, false)
}

func ListOperatorMessageAttachments(
	db *sql.DB,
	actorID string,
	ticketID string,
	messageID string,
) ([]MessageAttachment, error) {
	return listMessageAttachments(db, actorID, RoleOperator, ticketID, messageID, true)
}

func markTicketMessagesRead(
	db *sql.DB,
	actorID string,
	role ReporterRole,
	ticketID string,
	operatorWide bool,
) (MessageReadSummary, error) {
	actorID = strings.TrimSpace(actorID)
	ticketID = strings.TrimSpace(ticketID)
	if db == nil || actorID == "" || ticketID == "" || !validReporterRole(role) {
		return MessageReadSummary{}, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return MessageReadSummary{}, err
	}
	defer tx.Rollback()
	var ticketExists bool
	if operatorWide {
		err = tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM dsh_support_tickets WHERE id = $1::uuid)`, ticketID).Scan(&ticketExists)
	} else {
		err = tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM dsh_support_tickets
				WHERE id = $1::uuid AND reporter_id = $2 AND reporter_role = $3
			)`, ticketID, actorID, string(role)).Scan(&ticketExists)
	}
	if err != nil {
		return MessageReadSummary{}, err
	}
	if !ticketExists {
		return MessageReadSummary{}, ErrNotFound
	}

	readAt := time.Now().UTC()
	result, err := tx.Exec(`
		INSERT INTO dsh_support_message_read_receipts (
			message_id, ticket_id, actor_id, actor_role, read_at
		)
		SELECT m.id, m.ticket_id, $2, $3, $4
		FROM dsh_support_messages m
		WHERE m.ticket_id = $1::uuid
		  AND m.sender_id <> $2
		  AND ($5::boolean = TRUE OR m.is_internal = FALSE)
		ON CONFLICT (message_id, actor_id, actor_role) DO UPDATE
		SET read_at = GREATEST(dsh_support_message_read_receipts.read_at, EXCLUDED.read_at)`,
		ticketID, actorID, string(role), readAt, operatorWide)
	if err != nil {
		return MessageReadSummary{}, err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return MessageReadSummary{}, err
	}
	if err := tx.Commit(); err != nil {
		return MessageReadSummary{}, err
	}
	return MessageReadSummary{
		TicketID: ticketID, ActorID: actorID, ActorRole: string(role),
		MarkedCount: count, ReadAt: readAt,
	}, nil
}

func MarkActorTicketMessagesRead(db *sql.DB, actorID string, role ReporterRole, ticketID string) (MessageReadSummary, error) {
	return markTicketMessagesRead(db, actorID, role, ticketID, false)
}

func MarkOperatorTicketMessagesRead(db *sql.DB, actorID string, ticketID string) (MessageReadSummary, error) {
	return markTicketMessagesRead(db, actorID, RoleOperator, ticketID, true)
}
