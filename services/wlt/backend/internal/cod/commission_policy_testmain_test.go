package cod

import (
	"database/sql"
	"fmt"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

func TestMain(m *testing.M) {
	if os.Getenv("WLT_REQUIRE_DB_TESTS") == "true" {
		dsn := os.Getenv("DATABASE_URL")
		if dsn == "" {
			fmt.Fprintln(os.Stderr, "DATABASE_URL is required when WLT_REQUIRE_DB_TESTS=true")
			os.Exit(1)
		}
		db, err := sql.Open("postgres", dsn)
		if err != nil {
			fmt.Fprintf(os.Stderr, "open WLT test database: %v\n", err)
			os.Exit(1)
		}
		if err := db.Ping(); err != nil {
			_ = db.Close()
			fmt.Fprintf(os.Stderr, "ping WLT test database: %v\n", err)
			os.Exit(1)
		}
		_, err = db.Exec(`
			INSERT INTO wlt_commission_policies (
				id, name, commission_type, description, status, calculation_type,
				amount_minor_units, currency, created_by_actor_id
			)
			VALUES (
				'cpol_field_visit_standard',
				'Standard Field Visit Fee',
				'field_visit_fee',
				'Standard commission applied for a successful field visit',
				'active', 'fixed', 1000, 'YER', 'test-suite'
			)
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				commission_type = EXCLUDED.commission_type,
				description = EXCLUDED.description,
				status = 'active',
				calculation_type = EXCLUDED.calculation_type,
				amount_minor_units = EXCLUDED.amount_minor_units,
				currency = EXCLUDED.currency,
				updated_at = now()`)
		_ = db.Close()
		if err != nil {
			fmt.Fprintf(os.Stderr, "seed governed commission policy fixture: %v\n", err)
			os.Exit(1)
		}
	}
	os.Exit(m.Run())
}
