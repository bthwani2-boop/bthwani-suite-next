package partnerdelivery

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

type commandReceipt struct {
	Action      string
	Fingerprint string
	TaskID      sql.NullString
}

func commandFingerprint(parts ...string) string {
	h := sha256.New()
	for _, part := range parts {
		_, _ = h.Write([]byte(strings.TrimSpace(part)))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func normalizeCommandIdentity(actorID, commandID string) (string, string, error) {
	actorID = strings.TrimSpace(actorID)
	commandID = strings.TrimSpace(commandID)
	if actorID == "" || commandID == "" {
		return "", "", fmt.Errorf("%w: actorId and commandId are required", ErrInvalid)
	}
	if len(commandID) > 160 {
		return "", "", fmt.Errorf("%w: commandId is too long", ErrInvalid)
	}
	return actorID, commandID, nil
}

func (s *Service) executeCommand(
	ctx context.Context,
	actorID string,
	commandID string,
	action string,
	fingerprint string,
	invoke func() (*PartnerDeliveryTask, error),
	reconcile func() (*PartnerDeliveryTask, bool, error),
) (*PartnerDeliveryTask, error) {
	actorID, commandID, err := normalizeCommandIdentity(actorID, commandID)
	if err != nil {
		return nil, err
	}

	conn, err := s.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	lockKey := "partner_delivery|" + actorID + "|" + commandID
	if _, err := conn.ExecContext(ctx, `SELECT pg_advisory_lock(hashtextextended($1, 0))`, lockKey); err != nil {
		return nil, err
	}
	defer func() {
		_, _ = conn.ExecContext(context.Background(), `SELECT pg_advisory_unlock(hashtextextended($1, 0))`, lockKey)
	}()

	var receipt commandReceipt
	err = conn.QueryRowContext(ctx, `
		SELECT action, request_fingerprint, task_id
		FROM dsh_partner_delivery_command_receipts
		WHERE actor_id = $1 AND command_id = $2`, actorID, commandID).
		Scan(&receipt.Action, &receipt.Fingerprint, &receipt.TaskID)
	if err == nil {
		if receipt.Action != action || receipt.Fingerprint != fingerprint {
			return nil, ErrIdempotencyConflict
		}
		if receipt.TaskID.Valid && receipt.TaskID.String != "" {
			return Get(s.db, receipt.TaskID.String)
		}
		return nil, fmt.Errorf("%w: command receipt is incomplete", ErrConflict)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	task, invokeErr := invoke()
	if invokeErr != nil && reconcile != nil {
		var matched bool
		task, matched, err = reconcile()
		if err != nil {
			return nil, err
		}
		if !matched {
			return nil, invokeErr
		}
	} else if invokeErr != nil {
		return nil, invokeErr
	}
	if task == nil {
		return nil, fmt.Errorf("%w: command produced no task", ErrConflict)
	}

	_, err = conn.ExecContext(ctx, `
		INSERT INTO dsh_partner_delivery_command_receipts
			(actor_id, command_id, action, request_fingerprint, task_id, completed_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`,
		actorID, commandID, action, fingerprint, task.ID)
	if err != nil {
		return nil, err
	}
	return Get(s.db, task.ID)
}
