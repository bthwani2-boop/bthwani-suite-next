package ledger

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sort"

	"wlt-api/internal/shared"
)

// accountTypeMeta assigns each fixed wlt_ledger_accounts.account_type its
// accounting category and normal balance side. This is deliberately kept
// separate from the persisted wlt_ledger_accounts.balance_minor_units column
// (see wlt-017_ledger_kernel.sql), which applies a single "debit adds,
// credit subtracts" rule to every account regardless of type -- correct for
// asset accounts, backwards for liability/revenue accounts. This map lets
// BuildFinancialSummary derive correct signed balances straight from
// wlt_ledger_lines without depending on (or fixing) that column.
type accountTypeMeta struct {
	Category          string // "asset" | "liability" | "revenue"
	NormalBalanceSide string // "debit" | "credit"
}

var accountTypeMetadata = map[string]accountTypeMeta{
	"provider_clearing":              {Category: "asset", NormalBalanceSide: "debit"},
	"platform_commission_receivable": {Category: "asset", NormalBalanceSide: "debit"},
	"wallet":                         {Category: "liability", NormalBalanceSide: "credit"},
	"platform_payable":               {Category: "liability", NormalBalanceSide: "credit"},
	"platform_revenue":               {Category: "revenue", NormalBalanceSide: "credit"},
}

// knownDataGaps documents financial events that do not yet post to this
// kernel, so a summary built from it is known-incomplete for those events
// rather than silently presented as the whole truth. Update this list as
// each gap is closed.
var knownDataGaps = []string{
	"payment_capture_not_posted",
	"cod_collect_remit_not_posted",
}

type AccountBalance struct {
	AccountType       string `json:"accountType"`
	Category          string `json:"category"`
	NormalBalanceSide string `json:"normalBalanceSide"`
	Currency          string `json:"currency"`
	BalanceMinorUnits int64  `json:"balanceMinorUnits"`
}

type CurrencySummary struct {
	Currency              string           `json:"currency"`
	AssetsMinorUnits      int64            `json:"assetsMinorUnits"`
	LiabilitiesMinorUnits int64            `json:"liabilitiesMinorUnits"`
	RevenueMinorUnits     int64            `json:"revenueMinorUnits"`
	ExpensesMinorUnits    int64            `json:"expensesMinorUnits"`
	NetPositionMinorUnits int64            `json:"netPositionMinorUnits"`
	Accounts              []AccountBalance `json:"accounts"`
}

type FinancialSummary struct {
	Currencies       []CurrencySummary `json:"currencies"`
	DataCompleteness []string          `json:"dataCompleteness"`
}

// BuildFinancialSummary aggregates wlt_ledger_lines per (account_type,
// currency) directly -- not via the persisted balance_minor_units column --
// and applies each account type's normal balance side to produce correctly
// signed balances and per-currency Assets/Liabilities/Revenue/Expense
// totals and net position.
func BuildFinancialSummary(ctx context.Context, db *sql.DB) (*FinancialSummary, error) {
	const q = `
		SELECT a.account_type, a.currency,
			COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'debit'), 0) AS debit_total,
			COALESCE(SUM(l.amount_minor_units) FILTER (WHERE l.debit_credit = 'credit'), 0) AS credit_total
		FROM wlt_ledger_accounts a
		LEFT JOIN wlt_ledger_lines l ON l.account_id = a.id
		GROUP BY a.account_type, a.currency`

	rows, err := db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("query account balances: %w", err)
	}
	defer rows.Close()

	byCurrency := map[string]*CurrencySummary{}
	for rows.Next() {
		var accountType, currency string
		var debitTotal, creditTotal int64
		if err := rows.Scan(&accountType, &currency, &debitTotal, &creditTotal); err != nil {
			return nil, fmt.Errorf("scan account balance row: %w", err)
		}

		meta, ok := accountTypeMetadata[accountType]
		if !ok {
			return nil, fmt.Errorf("no accounting metadata registered for account_type %q", accountType)
		}

		var balance int64
		if meta.NormalBalanceSide == "debit" {
			balance = debitTotal - creditTotal
		} else {
			balance = creditTotal - debitTotal
		}

		cs, ok := byCurrency[currency]
		if !ok {
			cs = &CurrencySummary{Currency: currency}
			byCurrency[currency] = cs
		}
		cs.Accounts = append(cs.Accounts, AccountBalance{
			AccountType:       accountType,
			Category:          meta.Category,
			NormalBalanceSide: meta.NormalBalanceSide,
			Currency:          currency,
			BalanceMinorUnits: balance,
		})
		switch meta.Category {
		case "asset":
			cs.AssetsMinorUnits += balance
		case "liability":
			cs.LiabilitiesMinorUnits += balance
		case "revenue":
			cs.RevenueMinorUnits += balance
		case "expense":
			cs.ExpensesMinorUnits += balance
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate account balance rows: %w", err)
	}

	currencies := make([]string, 0, len(byCurrency))
	for currency, cs := range byCurrency {
		cs.NetPositionMinorUnits = cs.AssetsMinorUnits - cs.LiabilitiesMinorUnits
		currencies = append(currencies, currency)
	}
	sort.Strings(currencies)

	summary := &FinancialSummary{
		Currencies:       make([]CurrencySummary, 0, len(currencies)),
		DataCompleteness: knownDataGaps,
	}
	for _, currency := range currencies {
		cs := byCurrency[currency]
		sort.Slice(cs.Accounts, func(i, j int) bool { return cs.Accounts[i].AccountType < cs.Accounts[j].AccountType })
		summary.Currencies = append(summary.Currencies, *cs)
	}
	return summary, nil
}

func HandleFinancialSummary(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		summary, err := BuildFinancialSummary(r.Context(), db)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"financialSummary": summary})
	}
}
