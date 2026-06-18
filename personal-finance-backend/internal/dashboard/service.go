package dashboard

import (
	"personal-finance-backend/internal/models"
	"personal-finance-backend/pkg/ml"
)

type DashboardResponse struct {
	CurrentBalance   float64               `json:"current_balance"`
	TotalNetWorth    float64               `json:"total_net_worth"`
	TotalIncome      float64               `json:"total_income"`
	TotalExpenses    float64               `json:"total_expenses"`
	TotalInvestments float64               `json:"total_investments"`
	MonthlyBurnRate  float64               `json:"monthly_burn_rate"`
	ExpenseBreakdown map[string]float64    `json:"expense_breakdown"`
	MLSpenderType    string                `json:"ml_spender_type"`
	ActiveGoals      []models.Goal         `json:"active_goals"`
	RecentActivity   []models.Activity     `json:"recent_activity"`
}

func GetDashboardData(userID int) (*DashboardResponse, error) {
	breakdown, err := GetExpenseBreakdown(userID)
	if err != nil {
		return nil, err
	}

	metrics, err := GetFinancialMetrics(userID)
	if err != nil {
		return nil, err // Should never fail entirely based on the logic, but safety catch
	}

	goals, _ := GetActiveGoals(userID)
	recent, _ := GetRecentActivity(userID, 100)

	spenderType := "Analyzing..."
	if metrics["total_expenses"] > 0 {
		spenderType = ml.PredictSpenderType(breakdown)
	}

	currentBalance := metrics["total_income"] - metrics["total_expenses"] - metrics["total_investments"]
	netWorth := currentBalance + metrics["total_investments"]

	return &DashboardResponse{
		CurrentBalance:   currentBalance,
		TotalNetWorth:    netWorth,
		TotalIncome:      metrics["total_income"],
		TotalExpenses:    metrics["total_expenses"],
		TotalInvestments: metrics["total_investments"],
		MonthlyBurnRate  : metrics["monthly_burn_rate"],
		ExpenseBreakdown : breakdown,
		MLSpenderType    : spenderType,
		ActiveGoals      : goals,
		RecentActivity   : recent,
	}, nil
}
