package partner

import "database/sql"

// CountApprovedDocuments returns the latest version of each legal document
// type and how many of those versions are server-verified.
func CountApprovedDocuments(db *sql.DB, partnerID string) (total int, approved int, err error) {
	err = db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE review_status = 'verified')
		FROM (
			SELECT DISTINCT ON (document_type) review_status
			FROM dsh_partner_documents
			WHERE partner_id = $1
			ORDER BY document_type, created_at DESC
		) latest`, partnerID).Scan(&total, &approved)
	return total, approved, err
}
