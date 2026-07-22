package wlt

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type AnalyticsAccountBalance struct {
	AccountType       string `json:"accountType"`
	Category          string `json:"category"`
	NormalBalanceSide string `json:"normalBalanceSide"`
	Currency          string `json:"currency"`
	BalanceMinorUnits int64  `json:"balanceMinorUnits"`
}

type AnalyticsCurrencySummary struct {
	Currency              string                    `json:"currency"`
	AssetsMinorUnits      int64                     `json:"assetsMinorUnits"`
	LiabilitiesMinorUnits int64                     `json:"liabilitiesMinorUnits"`
	RevenueMinorUnits     int64                     `json:"revenueMinorUnits"`
	ExpensesMinorUnits    int64                     `json:"expensesMinorUnits"`
	NetPositionMinorUnits int64                     `json:"netPositionMinorUnits"`
	Accounts              []AnalyticsAccountBalance `json:"accounts"`
}

type AnalyticsFinancialSummary struct {
	Currencies       []AnalyticsCurrencySummary `json:"currencies"`
	DataCompleteness []string                   `json:"dataCompleteness"`
}

type AnalyticsFinancialSnapshot struct {
	Owner       string                     `json:"owner"`
	ReadOnly    bool                       `json:"readOnly"`
	ReadState   string                     `json:"readState"`
	GeneratedAt time.Time                  `json:"generatedAt"`
	Summary     *AnalyticsFinancialSummary `json:"summary"`
}

func (c *Client) ReadAnalyticsFinancialSnapshot(ctx context.Context) (AnalyticsFinancialSnapshot, error) {
	snapshot := AnalyticsFinancialSnapshot{
		Owner:       "WLT",
		ReadOnly:    true,
		ReadState:   "unavailable",
		GeneratedAt: time.Now().UTC(),
	}
	statusCode, body, err := c.FinanceRead(ctx, "/wlt/ledger/financial-summary", nil, "")
	if err != nil {
		return snapshot, fmt.Errorf("read WLT analytics through governed finance boundary: %w", err)
	}
	if statusCode < 200 || statusCode >= 300 {
		return snapshot, fmt.Errorf("WLT analytics read returned HTTP %d", statusCode)
	}
	var envelope struct {
		FinancialSummary AnalyticsFinancialSummary `json:"financialSummary"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return snapshot, fmt.Errorf("decode WLT analytics read: %w", err)
	}
	if envelope.FinancialSummary.Currencies == nil {
		envelope.FinancialSummary.Currencies = []AnalyticsCurrencySummary{}
	}
	if envelope.FinancialSummary.DataCompleteness == nil {
		envelope.FinancialSummary.DataCompleteness = []string{}
	}
	snapshot.ReadState = "available"
	snapshot.Summary = &envelope.FinancialSummary
	return snapshot, nil
}
