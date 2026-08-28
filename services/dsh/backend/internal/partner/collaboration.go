package partner

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/lib/pq"
)

var (
	ErrCollaborationNotFound            = errors.New("onboarding collaboration object not found")
	ErrCollaborationForbidden           = errors.New("onboarding collaboration access forbidden")
	ErrCollaborationReadOnly            = errors.New("field onboarding collaboration is read-only")
	ErrCollaborationInvalid             = errors.New("invalid onboarding collaboration input")
	ErrCollaborationIdempotencyConflict = errors.New("onboarding collaboration message identity conflict")
)

type CollaborationThread struct {
	ID                string    `json:"id"`
	OperatorContextID string    `json:"operatorContextId"`
	PartnerID         string    `json:"partnerId"`
	AssignmentID      string    `json:"assignmentId,omitempty"`
	DocumentID        string    `json:"documentId,omitempty"`
	Status            string    `json:"status"`
	CreatedByActorID  string    `json:"createdByActorId"`
	Version           int       `json:"version"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type CollaborationMessage struct {
	ID                  string    `json:"id"`
	ThreadID            string    `json:"threadId"`
	SenderActorID       string    `json:"senderActorId"`
	SenderSurface       string    `json:"senderSurface"`
	Body                string    `json:"body"`
	AttachmentMediaRefs []string  `json:"attachmentMediaRefs"`
	ClientMessageID     string    `json:"clientMessageId"`
	SequenceNumber      int       `json:"sequenceNumber"`
	CreatedAt           time.Time `json:"createdAt"`
}

type CollaborationChangeRequest struct {
	ID                 string     `json:"id"`
	ThreadID           string     `json:"threadId"`
	TargetKind         string     `json:"targetKind"`
	TargetID           string     `json:"targetId"`
	RequestedByActorID string     `json:"requestedByActorId"`
	Reason             string     `json:"reason"`
	Status             string     `json:"status"`
	ResolvedByActorID  string     `json:"resolvedByActorId,omitempty"`
	ResolvedAt         *time.Time `json:"resolvedAt,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type CollaborationView struct {
	Thread         CollaborationThread          `json:"thread"`
	PartnerVersion int                          `json:"partnerVersion"`
	Messages       []CollaborationMessage       `json:"messages"`
	ChangeRequests []CollaborationChangeRequest `json:"changeRequests"`
	UnreadCount    int                          `json:"unreadCount"`
}

type FieldOnboardingWorkloadItem struct {
	AssignmentID       string    `json:"assignmentId"`
	FieldActorID       string    `json:"fieldActorId"`
	AssignmentStatus   string    `json:"assignmentStatus"`
	StoreNameHint      string    `json:"storeNameHint"`
	PhoneHint          string    `json:"phoneHint,omitempty"`
	AddressHint        string    `json:"addressHint,omitempty"`
	PartnerID          string    `json:"partnerId,omitempty"`
	PartnerStatus      string    `json:"partnerStatus,omitempty"`
	PartnerVersion     int       `json:"partnerVersion,omitempty"`
	OpenChangeRequests int       `json:"openChangeRequests"`
	UnreadCount        int       `json:"unreadCount"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type CollaborationMessageInput struct {
	Body                string   `json:"body"`
	AttachmentMediaRefs []string `json:"attachmentMediaRefs"`
	ClientMessageID     string   `json:"clientMessageId"`
}

type CreateChangeRequestInput struct {
	TargetKind      string `json:"targetKind"`
	TargetID        string `json:"targetId"`
	Reason          string `json:"reason"`
	ExpectedVersion int    `json:"expectedVersion"`
	IdempotencyKey  string `json:"idempotencyKey"`
	CorrelationID   string `json:"correlationId"`
	ToStatus        string `json:"toStatus"`
}

func GetOrCreateCollaborationThread(ctx context.Context, db *sql.DB, actorID, surface, operatorContextID, partnerID, assignmentID, documentID string) (CollaborationThread, error) {
	if strings.TrimSpace(partnerID) == "" || (strings.TrimSpace(assignmentID) == "" && strings.TrimSpace(documentID) == "") {
		return CollaborationThread{}, ErrCollaborationInvalid
	}
	if err := authorizeCollaborationObject(ctx, db, actorID, surface, operatorContextID, partnerID, assignmentID, documentID); err != nil {
		return CollaborationThread{}, err
	}
	_, err := db.ExecContext(ctx, `
        INSERT INTO dsh_onboarding_collaboration_threads
            (operator_context_id, partner_id, assignment_id, document_id, created_by_actor_id)
        VALUES ($1,$2,NULLIF($3,'')::UUID,NULLIF($4,''),$5)
        ON CONFLICT DO NOTHING`, operatorContextID, partnerID, assignmentID, documentID, actorID)
	if err != nil {
		return CollaborationThread{}, fmt.Errorf("create onboarding collaboration thread: %w", err)
	}
	return loadCollaborationThread(ctx, db, actorID, surface, operatorContextID, partnerID, assignmentID, documentID)
}

func LoadCollaborationView(ctx context.Context, db *sql.DB, actorID, surface, operatorContextID, partnerID, assignmentID, documentID string) (CollaborationView, error) {
	thread, err := GetOrCreateCollaborationThread(ctx, db, actorID, surface, operatorContextID, partnerID, assignmentID, documentID)
	if err != nil {
		return CollaborationView{}, err
	}
	messages, err := listCollaborationMessages(ctx, db, thread.ID)
	if err != nil {
		return CollaborationView{}, err
	}
	requests, err := listChangeRequests(ctx, db, thread.ID)
	if err != nil {
		return CollaborationView{}, err
	}
	var partnerVersion int
	if err := db.QueryRowContext(ctx, `SELECT version FROM dsh_partners WHERE id=$1 AND operator_context_id=$2`, partnerID, operatorContextID).Scan(&partnerVersion); err != nil {
		return CollaborationView{}, err
	}
	var unread int
	if err := db.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM dsh_onboarding_collaboration_messages m
        LEFT JOIN dsh_onboarding_collaboration_read_cursors c
          ON c.thread_id=m.thread_id AND c.actor_id=$2
        WHERE m.thread_id=$1 AND m.sequence_number > COALESCE(c.last_read_sequence,0) AND m.sender_actor_id <> $2`, thread.ID, actorID).Scan(&unread); err != nil {
		return CollaborationView{}, err
	}
	return CollaborationView{Thread: thread, PartnerVersion: partnerVersion, Messages: messages, ChangeRequests: requests, UnreadCount: unread}, nil
}

func AddCollaborationMessage(ctx context.Context, db *sql.DB, actorID, surface, operatorContextID, partnerID, assignmentID, documentID string, input CollaborationMessageInput) (CollaborationMessage, error) {
	body := strings.TrimSpace(input.Body)
	clientMessageID := strings.TrimSpace(input.ClientMessageID)
	if len(body) == 0 || len(body) > 4000 || len(clientMessageID) < 8 || len(clientMessageID) > 200 {
		return CollaborationMessage{}, ErrCollaborationInvalid
	}
	thread, err := GetOrCreateCollaborationThread(ctx, db, actorID, surface, operatorContextID, partnerID, assignmentID, documentID)
	if err != nil {
		return CollaborationMessage{}, err
	}
	if surface == "app-field" {
		var status string
		if err := db.QueryRowContext(ctx, `SELECT activation_status FROM dsh_partners WHERE id=$1`, partnerID).Scan(&status); err != nil {
			return CollaborationMessage{}, err
		}
		if !IsFieldPartnerEditableStatus(ActivationStatus(status)) {
			return CollaborationMessage{}, ErrCollaborationReadOnly
		}
	}
	refs := uniqueCollaborationRefs(input.AttachmentMediaRefs)
	if err := validateCollaborationMedia(ctx, db, actorID, partnerID, refs); err != nil {
		return CollaborationMessage{}, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CollaborationMessage{}, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, thread.ID); err != nil {
		return CollaborationMessage{}, err
	}
	var message CollaborationMessage
	var refsValue []string
	err = tx.QueryRowContext(ctx, `
		SELECT id, thread_id, sender_actor_id, sender_surface, body, attachment_media_refs,
		       client_message_id, sequence_number, created_at
		FROM dsh_onboarding_collaboration_messages
		WHERE thread_id=$1 AND sender_actor_id=$2 AND client_message_id=$3`,
		thread.ID, actorID, clientMessageID).Scan(
		&message.ID, &message.ThreadID, &message.SenderActorID, &message.SenderSurface,
		&message.Body, pq.Array(&refsValue), &message.ClientMessageID,
		&message.SequenceNumber, &message.CreatedAt)
	if err == nil {
		message.AttachmentMediaRefs = refsValue
		if message.SenderSurface != surface || message.Body != body || !slices.Equal(message.AttachmentMediaRefs, refs) {
			return CollaborationMessage{}, ErrCollaborationIdempotencyConflict
		}
		return message, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return CollaborationMessage{}, err
	}
	err = tx.QueryRowContext(ctx, `
        INSERT INTO dsh_onboarding_collaboration_messages
            (thread_id, sender_actor_id, sender_surface, body, attachment_media_refs, client_message_id, sequence_number)
        VALUES ($1,$2,$3,$4,$5,$6,(SELECT COALESCE(MAX(sequence_number),0)+1 FROM dsh_onboarding_collaboration_messages WHERE thread_id=$1))
		RETURNING id, thread_id, sender_actor_id, sender_surface, body, attachment_media_refs, client_message_id, sequence_number, created_at`,
		thread.ID, actorID, surface, body, pq.Array(refs), clientMessageID).Scan(
		&message.ID, &message.ThreadID, &message.SenderActorID, &message.SenderSurface, &message.Body, pq.Array(&refsValue), &message.ClientMessageID, &message.SequenceNumber, &message.CreatedAt)
	if err != nil {
		return CollaborationMessage{}, err
	}
	message.AttachmentMediaRefs = refsValue
	if _, err := tx.ExecContext(ctx, `UPDATE dsh_onboarding_collaboration_threads SET updated_at=NOW(), version=version+1 WHERE id=$1`, thread.ID); err != nil {
		return CollaborationMessage{}, err
	}
	if err := tx.Commit(); err != nil {
		return CollaborationMessage{}, err
	}
	return message, nil
}

func MarkCollaborationRead(ctx context.Context, db *sql.DB, actorID, surface, operatorContextID, threadID string, sequence int) error {
	if sequence < 0 {
		return ErrCollaborationInvalid
	}
	var partnerID, assignmentID, documentID string
	if err := db.QueryRowContext(ctx, `SELECT partner_id,COALESCE(assignment_id::text,''),COALESCE(document_id,'' ) FROM dsh_onboarding_collaboration_threads WHERE id=$1 AND operator_context_id=$2`, threadID, operatorContextID).Scan(&partnerID, &assignmentID, &documentID); errors.Is(err, sql.ErrNoRows) {
		return ErrCollaborationNotFound
	} else if err != nil {
		return err
	}
	if err := authorizeCollaborationObject(ctx, db, actorID, surface, operatorContextID, partnerID, assignmentID, documentID); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx, `
        INSERT INTO dsh_onboarding_collaboration_read_cursors(thread_id,actor_id,last_read_sequence)
        VALUES($1,$2,$3)
        ON CONFLICT(thread_id,actor_id) DO UPDATE SET last_read_sequence=GREATEST(dsh_onboarding_collaboration_read_cursors.last_read_sequence,EXCLUDED.last_read_sequence), updated_at=NOW()`, threadID, actorID, sequence)
	return err
}

func CreateCollaborationChangeRequest(ctx context.Context, db *sql.DB, actorID, operatorContextID, partnerID, assignmentID, documentID string, input CreateChangeRequestInput) (CollaborationChangeRequest, error) {
	if len(strings.TrimSpace(input.Reason)) < 5 || strings.TrimSpace(input.IdempotencyKey) == "" || input.ExpectedVersion < 1 {
		return CollaborationChangeRequest{}, ErrCollaborationInvalid
	}
	thread, err := GetOrCreateCollaborationThread(ctx, db, actorID, "control-panel", operatorContextID, partnerID, assignmentID, documentID)
	if err != nil {
		return CollaborationChangeRequest{}, err
	}
	if input.TargetKind != "draft" && input.TargetKind != "document" && input.TargetKind != "assignment" {
		return CollaborationChangeRequest{}, ErrCollaborationInvalid
	}
	if input.ToStatus != string(StatusDocumentsMissing) && input.ToStatus != string(StatusOpsRejected) {
		return CollaborationChangeRequest{}, ErrCollaborationInvalid
	}
	if strings.TrimSpace(input.TargetID) == "" {
		return CollaborationChangeRequest{}, ErrCollaborationInvalid
	}
	var existing CollaborationChangeRequest
	err = db.QueryRowContext(ctx, `SELECT id,thread_id,target_kind,target_id,requested_by_actor_id,reason,status,COALESCE(resolved_by_actor_id,''),resolved_at,created_at FROM dsh_onboarding_change_requests WHERE thread_id=$1 AND idempotency_key=$2`, thread.ID, input.IdempotencyKey).Scan(
		&existing.ID, &existing.ThreadID, &existing.TargetKind, &existing.TargetID, &existing.RequestedByActorID, &existing.Reason, &existing.Status, &existing.ResolvedByActorID, &existing.ResolvedAt, &existing.CreatedAt)
	if err == nil {
		if existing.TargetKind != input.TargetKind || existing.TargetID != input.TargetID || existing.Reason != strings.TrimSpace(input.Reason) {
			return CollaborationChangeRequest{}, ErrIdempotencyConflict
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return CollaborationChangeRequest{}, err
	}
	var request CollaborationChangeRequest
	_, _, err = transitionStatusGoverned(ctx, db, partnerID, TransitionInput{ToStatus: ActivationStatus(input.ToStatus), ActorID: actorID, ActorSurface: "control-panel", Reason: strings.TrimSpace(input.Reason), CorrelationID: input.CorrelationID, IdempotencyKey: input.IdempotencyKey}, input.ExpectedVersion, func(tx *sql.Tx) error {
		return tx.QueryRowContext(ctx, `
			INSERT INTO dsh_onboarding_change_requests(thread_id,target_kind,target_id,requested_by_actor_id,reason,idempotency_key)
			VALUES($1,$2,$3,$4,$5,$6)
			ON CONFLICT(thread_id,idempotency_key) DO UPDATE SET reason=EXCLUDED.reason
			RETURNING id,thread_id,target_kind,target_id,requested_by_actor_id,reason,status,COALESCE(resolved_by_actor_id,''),resolved_at,created_at`,
			thread.ID, input.TargetKind, input.TargetID, actorID, strings.TrimSpace(input.Reason), input.IdempotencyKey).Scan(
			&request.ID, &request.ThreadID, &request.TargetKind, &request.TargetID, &request.RequestedByActorID, &request.Reason, &request.Status, &request.ResolvedByActorID, &request.ResolvedAt, &request.CreatedAt)
	})
	if err != nil {
		return CollaborationChangeRequest{}, err
	}
	if request.ID == "" {
		err = db.QueryRowContext(ctx, `SELECT id,thread_id,target_kind,target_id,requested_by_actor_id,reason,status,COALESCE(resolved_by_actor_id,''),resolved_at,created_at FROM dsh_onboarding_change_requests WHERE thread_id=$1 AND idempotency_key=$2`, thread.ID, input.IdempotencyKey).Scan(
			&request.ID, &request.ThreadID, &request.TargetKind, &request.TargetID, &request.RequestedByActorID, &request.Reason, &request.Status, &request.ResolvedByActorID, &request.ResolvedAt, &request.CreatedAt)
	}
	return request, err
}

func ListFieldOnboardingWorkload(ctx context.Context, db *sql.DB, operatorContextID, actorID, surface string) ([]FieldOnboardingWorkloadItem, error) {
	args := []any{operatorContextID}
	filter := ""
	if surface == "app-field" {
		filter = " AND a.field_actor_id=$2"
		args = append(args, actorID)
	}
	rows, err := db.QueryContext(ctx, `
        SELECT a.id,a.field_actor_id,a.status,a.store_name_hint,COALESCE(a.phone_hint,''),COALESCE(a.address_hint,''),
               COALESCE(a.draft_partner_id,''),COALESCE(p.activation_status,''),COALESCE(p.version,0),a.updated_at,
               COALESCE((SELECT COUNT(*) FROM dsh_onboarding_change_requests cr JOIN dsh_onboarding_collaboration_threads t ON t.id=cr.thread_id WHERE t.assignment_id=a.id AND cr.status='open'),0),
               COALESCE((SELECT COUNT(*) FROM dsh_onboarding_collaboration_messages m JOIN dsh_onboarding_collaboration_threads t ON t.id=m.thread_id LEFT JOIN dsh_onboarding_collaboration_read_cursors c ON c.thread_id=m.thread_id AND c.actor_id=$1 WHERE t.assignment_id=a.id AND m.sequence_number>COALESCE(c.last_read_sequence,0) AND m.sender_actor_id<>$1),0)
        FROM dsh_field_onboarding_assignments a LEFT JOIN dsh_partners p ON p.id=a.draft_partner_id
        WHERE a.operator_context_id=$1`+filter+` ORDER BY a.updated_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []FieldOnboardingWorkloadItem{}
	for rows.Next() {
		var item FieldOnboardingWorkloadItem
		if err := rows.Scan(&item.AssignmentID, &item.FieldActorID, &item.AssignmentStatus, &item.StoreNameHint, &item.PhoneHint, &item.AddressHint, &item.PartnerID, &item.PartnerStatus, &item.PartnerVersion, &item.UpdatedAt, &item.OpenChangeRequests, &item.UnreadCount); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func authorizeCollaborationObject(ctx context.Context, db *sql.DB, actorID, surface, operatorContextID, partnerID, assignmentID, documentID string) error {
	var partnerOwner string
	if err := db.QueryRowContext(ctx, `SELECT created_by_actor_id FROM dsh_partners WHERE id=$1 AND operator_context_id=$2`, partnerID, operatorContextID).Scan(&partnerOwner); errors.Is(err, sql.ErrNoRows) {
		return ErrCollaborationNotFound
	} else if err != nil {
		return err
	}
	if surface == "app-field" && partnerOwner != actorID {
		return ErrCollaborationForbidden
	}
	if assignmentID != "" {
		var assignmentContext, draftPartner, fieldActor string
		err := db.QueryRowContext(ctx, `SELECT operator_context_id,COALESCE(draft_partner_id,''),field_actor_id FROM dsh_field_onboarding_assignments WHERE id=$1`, assignmentID).Scan(&assignmentContext, &draftPartner, &fieldActor)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCollaborationNotFound
		}
		if err != nil {
			return err
		}
		if assignmentContext != operatorContextID || (draftPartner != "" && draftPartner != partnerID) {
			return ErrCollaborationForbidden
		}
		if surface == "app-field" && fieldActor != actorID {
			return ErrCollaborationForbidden
		}
	}
	if documentID != "" {
		var documentPartner string
		err := db.QueryRowContext(ctx, `SELECT partner_id FROM dsh_partner_documents WHERE id=$1`, documentID).Scan(&documentPartner)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCollaborationNotFound
		}
		if err != nil {
			return err
		}
		if documentPartner != partnerID {
			return ErrCollaborationForbidden
		}
	}
	return nil
}

func loadCollaborationThread(ctx context.Context, db *sql.DB, actorID, surface, operatorContextID, partnerID, assignmentID, documentID string) (CollaborationThread, error) {
	var thread CollaborationThread
	err := db.QueryRowContext(ctx, `SELECT id,operator_context_id,partner_id,COALESCE(assignment_id::text,''),COALESCE(document_id,''),status,created_by_actor_id,version,created_at,updated_at FROM dsh_onboarding_collaboration_threads WHERE operator_context_id=$1 AND partner_id=$2 AND assignment_id IS NOT DISTINCT FROM NULLIF($3,'')::UUID AND document_id IS NOT DISTINCT FROM NULLIF($4,'')`, operatorContextID, partnerID, assignmentID, documentID).Scan(&thread.ID, &thread.OperatorContextID, &thread.PartnerID, &thread.AssignmentID, &thread.DocumentID, &thread.Status, &thread.CreatedByActorID, &thread.Version, &thread.CreatedAt, &thread.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return CollaborationThread{}, ErrCollaborationNotFound
	}
	return thread, err
}

func listCollaborationMessages(ctx context.Context, db *sql.DB, threadID string) ([]CollaborationMessage, error) {
	rows, err := db.QueryContext(ctx, `SELECT id,thread_id,sender_actor_id,sender_surface,body,attachment_media_refs,client_message_id,sequence_number,created_at FROM dsh_onboarding_collaboration_messages WHERE thread_id=$1 ORDER BY sequence_number ASC`, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CollaborationMessage{}
	for rows.Next() {
		var m CollaborationMessage
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.SenderActorID, &m.SenderSurface, &m.Body, pq.Array(&m.AttachmentMediaRefs), &m.ClientMessageID, &m.SequenceNumber, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func listChangeRequests(ctx context.Context, db *sql.DB, threadID string) ([]CollaborationChangeRequest, error) {
	rows, err := db.QueryContext(ctx, `SELECT id,thread_id,target_kind,target_id,requested_by_actor_id,reason,status,COALESCE(resolved_by_actor_id,''),resolved_at,created_at FROM dsh_onboarding_change_requests WHERE thread_id=$1 ORDER BY created_at ASC`, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CollaborationChangeRequest{}
	for rows.Next() {
		var r CollaborationChangeRequest
		if err := rows.Scan(&r.ID, &r.ThreadID, &r.TargetKind, &r.TargetID, &r.RequestedByActorID, &r.Reason, &r.Status, &r.ResolvedByActorID, &r.ResolvedAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func validateCollaborationMedia(ctx context.Context, db *sql.DB, actorID, partnerID string, refs []string) error {
	for _, ref := range refs {
		var ok bool
		if err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM dsh_media_refs WHERE media_ref=$1 AND partner_id=$2 AND owner_actor_id=$3 AND purpose IN ('partner_document','field_readiness_evidence'))`, ref, partnerID, actorID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return ErrCollaborationForbidden
		}
	}
	return nil
}

func uniqueCollaborationRefs(input []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, v := range input {
		v = strings.TrimSpace(v)
		if v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}
