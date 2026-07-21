package orders

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
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

func validOrderTruthID(value string) bool {
	_, err := uuid.Parse(strings.TrimSpace(value))
	return err == nil
}

func GetClientScopedOrderTruth(db *sql.DB, orderID, tenantID, clientID string) (*OrderTruth, error) {
	orderID = strings.TrimSpace(orderID)
	tenantID = strings.TrimSpace(tenantID)
	clientID = strings.TrimSpace(clientID)
	if !validOrderTruthID(orderID) || tenantID == "" || clientID == "" {
		return nil, ErrInvalid
	}
	var scopedID string
	err := db.QueryRow(`
		SELECT id::text FROM dsh_orders
		WHERE id=$1::uuid AND tenant_id=$2 AND client_id=$3`, orderID, tenantID, clientID,
	).Scan(&scopedID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return getScopedOrderTruth(db, scopedID, tenantID, "client")
}

func GetPartnerScopedOrderTruth(db *sql.DB, orderID, tenantID, storeID string) (*OrderTruth, error) {
	orderID = strings.TrimSpace(orderID)
	tenantID = strings.TrimSpace(tenantID)
	storeID = strings.TrimSpace(storeID)
	if !validOrderTruthID(orderID) || tenantID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	var scopedID string
	err := db.QueryRow(`
		SELECT id::text FROM dsh_orders
		WHERE id=$1::uuid AND tenant_id=$2 AND store_id=$3`, orderID, tenantID, storeID,
	).Scan(&scopedID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return getScopedOrderTruth(db, scopedID, tenantID, "partner")
}

func GetOperatorScopedOrderTruth(db *sql.DB, orderID, tenantID string) (*OrderTruth, error) {
	orderID = strings.TrimSpace(orderID)
	tenantID = strings.TrimSpace(tenantID)
	if !validOrderTruthID(orderID) || tenantID == "" {
		return nil, ErrInvalid
	}
	return getScopedOrderTruth(db, orderID, tenantID, "operator")
}

func getScopedOrderTruth(db *sql.DB, orderID, tenantID, viewerRole string) (*OrderTruth, error) {
	truth, err := GetOrderTruth(db, orderID, tenantID, viewerRole)
	if err != nil {
		return nil, err
	}
	RedactOrderTruthForViewer(truth, viewerRole)
	return truth, nil
}

func listOrderTruthByScope(db *sql.DB, tenantID, viewerRole, scopeID, status string, limit int) ([]OrderTruth, error) {
	tenantID = strings.TrimSpace(tenantID)
	scopeID = strings.TrimSpace(scopeID)
	status = strings.TrimSpace(status)
	if tenantID == "" {
		return nil, ErrInvalid
	}
	if viewerRole == "client" && scopeID == "" {
		return nil, ErrInvalid
	}
	if viewerRole == "partner" && scopeID == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

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
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	result := make([]OrderTruth, 0, len(ids))
	for _, id := range ids {
		truth, readErr := getScopedOrderTruth(db, id, tenantID, viewerRole)
		if readErr != nil {
			return nil, readErr
		}
		result = append(result, *truth)
	}
	return result, nil
}

func RedactOrderTruthForViewer(truth *OrderTruth, viewerRole string) {
	if truth == nil {
		return
	}
	if truth.Items == nil {
		truth.Items = []OrderTruthItem{}
	}
	if truth.StatusTimeline == nil {
		truth.StatusTimeline = []OrderTruthEvent{}
	}
	if truth.AllowedActions == nil {
		truth.AllowedActions = []string{"view"}
	}
	if viewerRole == "partner" || viewerRole == "operator" {
		truth.ClientID = ""
		truth.DeliveryAddressSnapshot = []byte(`{"redacted":true}`)
		for index := range truth.StatusTimeline {
			// Event metadata may contain actor- or provider-specific diagnostics.
			// Non-client surfaces receive only the canonical event envelope.
			truth.StatusTimeline[index].Metadata = []byte(`{}`)
		}
	}
}
