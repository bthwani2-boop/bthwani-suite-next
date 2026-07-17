package analytics

import (
	"database/sql"
	"time"
)

func periodFilter(period string) time.Time {
	now := time.Now().UTC()
	switch period {
	case "week":
		return now.AddDate(0, 0, -7)
	case "month":
		return now.AddDate(0, -1, 0)
	default:
		y, m, d := now.Date()
		return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
	}
}

type PlatformKpis struct {
	TotalOrders          int       `json:"totalOrders"`
	DeliveredOrders      int       `json:"deliveredOrders"`
	CancelledOrders      int       `json:"cancelledOrders"`
	ActiveStores         int       `json:"activeStores"`
	OpenTickets          int       `json:"openTickets"`
	FieldVisitsCompleted int       `json:"fieldVisitsCompleted"`
	OpenEscalations      int       `json:"openEscalations"`
	OpenIncidents        int       `json:"openIncidents"`
	Period               string    `json:"period"`
	GeneratedAt          time.Time `json:"generatedAt"`
}

func GetPlatformKpis(db *sql.DB, period string) (PlatformKpis, error) {
	since := periodFilter(period)
	kpis := PlatformKpis{Period: period, GeneratedAt: time.Now().UTC()}

	rows := []struct {
		dest *int
		q    string
		args []any
	}{
		{&kpis.TotalOrders, `SELECT COUNT(*) FROM dsh_orders WHERE created_at >= $1`, []any{since}},
		{&kpis.DeliveredOrders, `SELECT COUNT(*) FROM dsh_orders WHERE status = 'delivered' AND created_at >= $1`, []any{since}},
		{&kpis.CancelledOrders, `SELECT COUNT(*) FROM dsh_orders WHERE status = 'cancelled' AND created_at >= $1`, []any{since}},
		{&kpis.ActiveStores, `SELECT COUNT(*) FROM dsh_stores WHERE visibility_status = 'active'`, nil},
		{&kpis.OpenTickets, `SELECT COUNT(*) FROM dsh_support_tickets WHERE status NOT IN ('resolved','closed')`, nil},
		{&kpis.FieldVisitsCompleted, `SELECT COUNT(*) FROM dsh_field_visits WHERE status = 'complete' AND created_at >= $1`, []any{since}},
		{&kpis.OpenEscalations, `SELECT COUNT(*) FROM dsh_readiness_escalations WHERE status = 'open'`, nil},
		{&kpis.OpenIncidents, `SELECT COUNT(*) FROM dsh_incidents WHERE status != 'resolved'`, nil},
	}

	for _, row := range rows {
		var err error
		if row.args != nil {
			err = db.QueryRow(row.q, row.args...).Scan(row.dest)
		} else {
			err = db.QueryRow(row.q).Scan(row.dest)
		}
		if err != nil {
			return kpis, err
		}
	}
	return kpis, nil
}

type OrderStatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type OrderAnalytics struct {
	TotalOrders int                `json:"totalOrders"`
	ByStatus    []OrderStatusCount `json:"byStatus"`
	Period      string             `json:"period"`
	GeneratedAt time.Time          `json:"generatedAt"`
}

func GetOrderAnalytics(db *sql.DB, period string) (OrderAnalytics, error) {
	since := periodFilter(period)
	out := OrderAnalytics{Period: period, GeneratedAt: time.Now().UTC()}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_orders WHERE created_at >= $1`, since).Scan(&out.TotalOrders); err != nil {
		return out, err
	}
	rows, err := db.Query(`
		SELECT status, COUNT(*) FROM dsh_orders
		WHERE created_at >= $1
		GROUP BY status ORDER BY status`, since)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var count OrderStatusCount
		if err := rows.Scan(&count.Status, &count.Count); err != nil {
			return out, err
		}
		out.ByStatus = append(out.ByStatus, count)
	}
	if out.ByStatus == nil {
		out.ByStatus = []OrderStatusCount{}
	}
	return out, rows.Err()
}

type DeliveryAnalytics struct {
	TotalAssignments     int       `json:"totalAssignments"`
	AcceptedAssignments  int       `json:"acceptedAssignments"`
	CompletedAssignments int       `json:"completedAssignments"`
	DeclinedAssignments  int       `json:"declinedAssignments"`
	Period               string    `json:"period"`
	GeneratedAt          time.Time `json:"generatedAt"`
}

func GetDeliveryAnalytics(db *sql.DB, period string) (DeliveryAnalytics, error) {
	since := periodFilter(period)
	out := DeliveryAnalytics{Period: period, GeneratedAt: time.Now().UTC()}
	queries := []struct {
		dest *int
		q    string
	}{
		{&out.TotalAssignments, `SELECT COUNT(*) FROM dsh_assignments WHERE created_at >= $1`},
		{&out.AcceptedAssignments, `SELECT COUNT(*) FROM dsh_assignments WHERE status IN ('accepted','completed') AND created_at >= $1`},
		{&out.CompletedAssignments, `SELECT COUNT(*) FROM dsh_assignments WHERE status = 'completed' AND created_at >= $1`},
		{&out.DeclinedAssignments, `SELECT COUNT(*) FROM dsh_assignments WHERE status = 'declined' AND created_at >= $1`},
	}
	for _, query := range queries {
		if err := db.QueryRow(query.q, since).Scan(query.dest); err != nil {
			return out, err
		}
	}
	return out, nil
}

type TicketCategoryCount struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

type SupportAnalytics struct {
	TotalTickets    int                   `json:"totalTickets"`
	OpenTickets     int                   `json:"openTickets"`
	ResolvedTickets int                   `json:"resolvedTickets"`
	ByCategory      []TicketCategoryCount `json:"byCategory"`
	Period          string                `json:"period"`
	GeneratedAt     time.Time             `json:"generatedAt"`
}

func GetSupportAnalytics(db *sql.DB, period string) (SupportAnalytics, error) {
	since := periodFilter(period)
	out := SupportAnalytics{Period: period, GeneratedAt: time.Now().UTC()}
	queries := []struct {
		dest *int
		q    string
	}{
		{&out.TotalTickets, `SELECT COUNT(*) FROM dsh_support_tickets WHERE created_at >= $1`},
		{&out.OpenTickets, `SELECT COUNT(*) FROM dsh_support_tickets WHERE status NOT IN ('resolved','closed') AND created_at >= $1`},
		{&out.ResolvedTickets, `SELECT COUNT(*) FROM dsh_support_tickets WHERE status IN ('resolved','closed') AND created_at >= $1`},
	}
	for _, query := range queries {
		if err := db.QueryRow(query.q, since).Scan(query.dest); err != nil {
			return out, err
		}
	}

	rows, err := db.Query(`
		SELECT category, COUNT(*) FROM dsh_support_tickets
		WHERE created_at >= $1
		GROUP BY category ORDER BY category`, since)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var count TicketCategoryCount
		if err := rows.Scan(&count.Category, &count.Count); err != nil {
			return out, err
		}
		out.ByCategory = append(out.ByCategory, count)
	}
	if out.ByCategory == nil {
		out.ByCategory = []TicketCategoryCount{}
	}
	return out, rows.Err()
}

type StoreAnalytics struct {
	TotalStores       int       `json:"totalStores"`
	ActiveStores      int       `json:"activeStores"`
	SuspendedStores   int       `json:"suspendedStores"`
	PendingReadiness  int       `json:"pendingReadiness"`
	ReadinessComplete int       `json:"readinessComplete"`
	GeneratedAt       time.Time `json:"generatedAt"`
}

func GetStoreAnalytics(db *sql.DB) (StoreAnalytics, error) {
	out := StoreAnalytics{GeneratedAt: time.Now().UTC()}
	queries := []struct {
		dest *int
		q    string
	}{
		{&out.TotalStores, `SELECT COUNT(*) FROM dsh_stores`},
		{&out.ActiveStores, `SELECT COUNT(*) FROM dsh_stores WHERE visibility_status = 'active'`},
		{&out.SuspendedStores, `SELECT COUNT(*) FROM dsh_stores WHERE visibility_status = 'suspended'`},
		{&out.PendingReadiness, `SELECT COUNT(*) FROM dsh_stores s WHERE NOT EXISTS (
			SELECT 1 FROM dsh_field_visits fv WHERE fv.store_id = s.id AND fv.status = 'complete'
		)`},
		{&out.ReadinessComplete, `SELECT COUNT(*) FROM dsh_stores s WHERE EXISTS (
			SELECT 1 FROM dsh_field_visits fv WHERE fv.store_id = s.id AND fv.status = 'complete'
		)`},
	}
	for _, query := range queries {
		if err := db.QueryRow(query.q).Scan(query.dest); err != nil {
			return out, err
		}
	}
	return out, nil
}

type PartnerPerformance struct {
	StoreID        string    `json:"storeId"`
	TotalOrders    int       `json:"totalOrders"`
	AcceptedOrders int       `json:"acceptedOrders"`
	RejectedOrders int       `json:"rejectedOrders"`
	Period         string    `json:"period"`
	GeneratedAt    time.Time `json:"generatedAt"`
}

func GetPartnerPerformance(db *sql.DB, storeID, period string) (PartnerPerformance, error) {
	since := periodFilter(period)
	out := PartnerPerformance{StoreID: storeID, Period: period, GeneratedAt: time.Now().UTC()}
	queries := []struct {
		dest *int
		q    string
	}{
		{&out.TotalOrders, `SELECT COUNT(*) FROM dsh_orders WHERE store_id = $2 AND created_at >= $1`},
		{&out.AcceptedOrders, `SELECT COUNT(*) FROM dsh_orders WHERE store_id = $2 AND status != 'cancelled' AND created_at >= $1`},
		{&out.RejectedOrders, `SELECT COUNT(*) FROM dsh_orders WHERE store_id = $2 AND status = 'cancelled' AND created_at >= $1`},
	}
	for _, query := range queries {
		if err := db.QueryRow(query.q, since, storeID).Scan(query.dest); err != nil {
			return out, err
		}
	}
	return out, nil
}
