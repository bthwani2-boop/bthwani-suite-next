package orders

import (
	"database/sql"
	"strings"
)

func ListClientOrderTruth(db *sql.DB, tenantID, clientID string, limit int) ([]OrderTruth, error) {
	return listOrderTruthByScope(db, tenantID, "client", clientID, "", limit)
}

func ListPartnerOrderTruth(db *sql.DB, tenantID, storeID, status string, limit int) ([]OrderTruth, error) {
	return listOrderTruthByScope(db, tenantID, "partner", storeID, status, limit)
}

func ListOperatorOrderTruth(db *sql.DB, tenantID, status string, limit int) ([]OrderTruth, error) {
	return listOrderTruthByScope(db, tenantID, "operator", "", status, limit)
}

func listOrderTruthByScope(db *sql.DB, tenantID, viewerRole, scopeID, status string, limit int) ([]OrderTruth, error) {
	tenantID = strings.TrimSpace(tenantID)
	scopeID = strings.TrimSpace(scopeID)
	status = strings.TrimSpace(status)
	if tenantID == "" { return nil, ErrInvalid }
	if viewerRole == "client" && scopeID == "" { return nil, ErrInvalid }
	if viewerRole == "partner" && scopeID == "" { return nil, ErrInvalid }
	if limit <= 0 || limit > 200 { limit = 50 }

	var rows *sql.Rows
	var err error
	switch viewerRole {
	case "client":
		rows, err = db.Query(`SELECT id::text FROM dsh_orders WHERE tenant_id=$1 AND client_id=$2 ORDER BY created_at DESC LIMIT $3`, tenantID, scopeID, limit)
	case "partner":
		if status == "" {
			rows, err = db.Query(`SELECT id::text FROM dsh_orders WHERE tenant_id=$1 AND store_id=$2 ORDER BY created_at DESC LIMIT $3`, tenantID, scopeID, limit)
		} else {
			rows, err = db.Query(`SELECT id::text FROM dsh_orders WHERE tenant_id=$1 AND store_id=$2 AND status=$3 ORDER BY created_at DESC LIMIT $4`, tenantID, scopeID, status, limit)
		}
	case "operator":
		if status == "" {
			rows, err = db.Query(`SELECT id::text FROM dsh_orders WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2`, tenantID, limit)
		} else {
			rows, err = db.Query(`SELECT id::text FROM dsh_orders WHERE tenant_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3`, tenantID, status, limit)
		}
	default:
		return nil, ErrInvalid
	}
	if err != nil { return nil, err }
	defer rows.Close()
	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil { return nil, err }
		ids = append(ids, id)
	}
	if err = rows.Err(); err != nil { return nil, err }

	result := make([]OrderTruth, 0, len(ids))
	for _, id := range ids {
		truth, readErr := GetOrderTruth(db, id, tenantID, viewerRole)
		if readErr != nil { return nil, readErr }
		result = append(result, *truth)
	}
	return result, nil
}

func RedactOrderTruthForViewer(truth *OrderTruth, viewerRole string) {
	if truth == nil { return }
	if truth.Items == nil { truth.Items = []OrderTruthItem{} }
	if truth.StatusTimeline == nil { truth.StatusTimeline = []OrderTruthEvent{} }
	if truth.AllowedActions == nil { truth.AllowedActions = []string{"view"} }
	if viewerRole == "partner" {
		truth.ClientID = ""
		truth.DeliveryAddressSnapshot = []byte(`{"redacted":true}`)
	}
	if viewerRole == "operator" {
		truth.ClientID = ""
	}
}
