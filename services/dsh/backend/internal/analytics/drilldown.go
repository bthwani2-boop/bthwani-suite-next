package analytics

import (
	"database/sql"
	"fmt"
	"net/url"
	"strings"
	"time"
)

type OperationalRecord struct {
	ID        string    `json:"id"`
	Kind      string    `json:"kind"`
	Status    string    `json:"status"`
	StoreID   string    `json:"storeId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	DetailURL string    `json:"detailUrl"`
}

type OperationalDrilldown struct {
	Records  []OperationalRecord `json:"records"`
	Metadata Metadata            `json:"metadata"`
}

func orderOperationsDetailURL(orderID string) string {
	return fmt.Sprintf(
		"/dsh/operations?workspace=live-orders&subGroup=queue&orderId=%s&panel=detail",
		url.QueryEscape(strings.TrimSpace(orderID)),
	)
}

func ListOrderDrilldown(db *sql.DB, window Window, storeID, status string, limit int) (OperationalDrilldown, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	storeID = strings.TrimSpace(storeID)
	status = strings.TrimSpace(status)
	out := OperationalDrilldown{
		Records: []OperationalRecord{},
		Metadata: NewMetadata(window,
			"dsh_orders.id",
			"dsh_orders.status",
			"dsh_orders.store_id",
			"dsh_orders.created_at",
			"dsh_orders.updated_at",
		),
	}
	const query = `
		SELECT id::text, status, store_id, created_at, updated_at
		FROM dsh_orders
		WHERE created_at >= $1 AND created_at < $2
		  AND ($3 = '' OR store_id = $3)
		  AND ($4 = '' OR status = $4)
		ORDER BY created_at DESC
		LIMIT $5`
	rows, err := db.Query(query, window.From, window.To, storeID, status, limit)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var row OperationalRecord
		row.Kind = "order"
		if err := rows.Scan(&row.ID, &row.Status, &row.StoreID, &row.CreatedAt, &row.UpdatedAt); err != nil {
			return out, err
		}
		row.DetailURL = orderOperationsDetailURL(row.ID)
		out.Records = append(out.Records, row)
	}
	return out, rows.Err()
}
