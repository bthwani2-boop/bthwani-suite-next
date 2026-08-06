package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	files := []string{
		`c:\bthwani-suite-next\services\wlt\database\migrations\wlt-118_wallet_balances_view.sql`,
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			panic(err)
		}
		_, err = db.Exec(string(content))
		if err != nil {
			panic(fmt.Errorf("error executing %s: %v", file, err))
		}
		fmt.Printf("Successfully applied %s\n", file)
	}
}
