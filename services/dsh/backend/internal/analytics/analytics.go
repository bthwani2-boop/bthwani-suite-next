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

	// Ensure we get actual freshness from projections
	if freshness, err := GetFreshness(db, "platform.orders"); err == nil {
		kpis.GeneratedAt = freshness
	}

	// Read from versioned projections instead of raw dsh_orders table
	query := `
		SELECT metric_id, COALESCE(SUM(metric_value), 0)
		FROM dsh_analytics_projections
		WHERE metric_id LIKE 'platform.%' AND period_start >= $1
		GROUP BY metric_id
	`
	rows, err := db.Query(query, since)
	if err != nil {
		return kpis, err
	}
	defer rows.Close()

	for rows.Next() {
		var metricID string
		var value int
		if err := rows.Scan(&metricID, &value); err != nil {
			return kpis, err
		}
		switch metricID {
		case "platform.orders.total":
			kpis.TotalOrders = value
		case "platform.orders.delivered":
			kpis.DeliveredOrders = value
		case "platform.orders.cancelled":
			kpis.CancelledOrders = value
		case "platform.stores.active":
			kpis.ActiveStores = value
		case "platform.support.open_tickets":
			kpis.OpenTickets = value
		case "platform.field.visits_completed":
			kpis.FieldVisitsCompleted = value
		case "platform.readiness.open_escalations":
			kpis.OpenEscalations = value
		case "platform.incidents.open":
			kpis.OpenIncidents = value
		}
	}
	return kpis, rows.Err()
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
	// Read from versioned projections instead of raw dsh_assignments table
	query := `
		SELECT metric_id, COALESCE(SUM(metric_value), 0)
		FROM dsh_analytics_projections
		WHERE metric_id LIKE 'platform.assignments.%' AND period_start >= $1
		GROUP BY metric_id
	`
	rows, err := db.Query(query, since)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	for rows.Next() {
		var metricID string
		var value int
		if err := rows.Scan(&metricID, &value); err != nil {
			return out, err
		}
		switch metricID {
		case "platform.assignments.total":
			out.TotalAssignments = value
		case "platform.assignments.accepted":
			out.AcceptedAssignments = value
		case "platform.assignments.completed":
			out.CompletedAssignments = value
		case "platform.assignments.declined":
			out.DeclinedAssignments = value
		}
	}
	return out, rows.Err()
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
	// Read from versioned projections instead of raw dsh_support_tickets table
	query := `
		SELECT metric_id, COALESCE(SUM(metric_value), 0)
		FROM dsh_analytics_projections
		WHERE metric_id LIKE 'platform.support.%' AND period_start >= $1
		GROUP BY metric_id
	`
	metricRows, err := db.Query(query, since)
	if err != nil {
		return out, err
	}
	defer metricRows.Close()

	for metricRows.Next() {
		var metricID string
		var value int
		if err := metricRows.Scan(&metricID, &value); err != nil {
			return out, err
		}
		switch metricID {
		case "platform.support.total_tickets":
			out.TotalTickets = value
		case "platform.support.open_tickets":
			out.OpenTickets = value
		case "platform.support.resolved_tickets":
			out.ResolvedTickets = value
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
		{&out.ActiveStores, `SELECT COUNT(*) FROM dsh_stores WHERE status = 'active' AND is_visible = TRUE`},
		{&out.SuspendedStores, `SELECT COUNT(*) FROM dsh_stores WHERE status IN ('inactive','unavailable') OR is_visible = FALSE`},
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
		{&out.AcceptedOrders, `SELECT COUNT(*) FROM dsh_orders WHERE store_id = $2 AND status IN (
			'store_accepted','preparing','ready_for_pickup','driver_assigned','driver_arrived_store',
			'picked_up','arrived_customer','returning_to_store','returned_to_store','delivered'
		) AND created_at >= $1`},
		{&out.RejectedOrders, `SELECT COUNT(*) FROM dsh_orders WHERE store_id = $2 AND (status = 'cancelled' OR status LIKE 'cancelled_%') AND created_at >= $1`},
	}
	for _, query := range queries {
		if err := db.QueryRow(query.q, since, storeID).Scan(query.dest); err != nil {
			return out, err
		}
	}
	return out, nil
}
