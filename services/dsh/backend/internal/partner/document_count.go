package partner

import "database/sql"

// CountApprovedDocuments returns the total number of documents for the partner
// and how many of them carry a review_status of 'approved'.
func CountApprovedDocuments(db *sql.DB, partnerID string) (total int, approved int, err error) {
	err = db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE review_status = 'approved')
		FROM dsh_partner_documents
		WHERE partner_id = $1`, partnerID).Scan(&total, &approved)
	return total, approved, err
}
