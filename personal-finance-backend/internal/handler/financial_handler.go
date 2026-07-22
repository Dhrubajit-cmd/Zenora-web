package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"personal-finance-backend/internal/dashboard"
	"personal-finance-backend/internal/middleware"
	"personal-finance-backend/internal/models"
	"personal-finance-backend/internal/repository"
	"strings"
	"time"
)

func OnboardingBatchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDValue := r.Context().Value(middleware.UserIDKey)
	if userIDValue == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := userIDValue.(int)

	var payload models.OnboardingPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if payload.Age > 0 {
		_ = repository.UpdateUserAge(userID, payload.Age)
	}

	for i := range payload.Expenses {
		payload.Expenses[i].UserID = userID
		rawLower := strings.ToLower(payload.Expenses[i].Description)
		if override, exists := repository.GetOverride(userID, rawLower); exists {
			payload.Expenses[i].Category = override
		} else if payload.Expenses[i].Category == "" {
			payload.Expenses[i].Category = "other"
		}
	}
	_ = repository.CreateExpensesBatch(payload.Expenses)

	for i := range payload.Incomes {
		payload.Incomes[i].UserID = userID
	}
	_ = repository.CreateIncomesBatch(payload.Incomes)

	for i := range payload.Investments {
		payload.Investments[i].UserID = userID
	}
	_ = repository.CreateInvestmentsBatch(payload.Investments)

	for i := range payload.Goals {
		payload.Goals[i].UserID = userID
	}
	_ = repository.CreateGoalsBatch(payload.Goals)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Onboarding data saved successfully"}`))
}

func CreateExpenseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var expense models.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	expense.UserID = userID

	if expense.ExpenseDate == "" {
		expense.ExpenseDate = time.Now().Format("2006-01-02")
	}

	// In the transactions frontend form, we now map user input to expense.Description
	rawLower := strings.ToLower(expense.Description)
	if override, exists := repository.GetOverride(userID, rawLower); exists {
		expense.Category = override
	} else if expense.Category == "" {
		expense.Category = "other"
	}

	if err := repository.CreateExpense(expense); err != nil {
		http.Error(w, "Failed to create expense", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Expense created successfully"}`))
}

func CreateExpensesBatchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var expenses []models.Expense
	if err := json.NewDecoder(r.Body).Decode(&expenses); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	for i := range expenses {
		expenses[i].UserID = userID
		if expenses[i].ExpenseDate == "" {
			expenses[i].ExpenseDate = time.Now().Format("2006-01-02")
		}
		rawLower := strings.ToLower(expenses[i].Description)
		if override, exists := repository.GetOverride(userID, rawLower); exists {
			expenses[i].Category = override
		} else if expenses[i].Category == "" {
			expenses[i].Category = "other"
		}
	}

	if err := repository.CreateExpensesBatch(expenses); err != nil {
		http.Error(w, "Failed to create expenses batch", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Expenses batch created successfully"}`))
}

func CreateIncomesBatchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var incomes []models.Income
	if err := json.NewDecoder(r.Body).Decode(&incomes); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	for i := range incomes {
		incomes[i].UserID = userID
		if incomes[i].IncomeDate == "" {
			incomes[i].IncomeDate = time.Now().Format("2006-01-02")
		}
	}

	if err := repository.CreateIncomesBatch(incomes); err != nil {
		log.Printf("Error creating incomes batch: %v", err)
		http.Error(w, "Failed to create incomes batch", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Incomes batch created successfully"}`))
}

func CreateIncomeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var income models.Income
	if err := json.NewDecoder(r.Body).Decode(&income); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	income.UserID = userID

	if income.IncomeDate == "" {
		income.IncomeDate = time.Now().Format("2006-01-02")
	}

	if err := repository.CreateIncome(income); err != nil {
		http.Error(w, "Failed to create income", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Income created successfully"}`))
}

func CreateInvestmentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var investment models.Investment
	if err := json.NewDecoder(r.Body).Decode(&investment); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	investment.UserID = userID

	if investment.InvestmentDate == "" {
		investment.InvestmentDate = time.Now().Format("2006-01-02")
	}

	if err := repository.CreateInvestment(investment); err != nil {
		http.Error(w, "Failed to create investment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Investment created successfully"}`))
}

func CreateGoalHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var goal models.Goal
	if err := json.NewDecoder(r.Body).Decode(&goal); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	goal.UserID = userID

	// TargetDate usually requires manual setting, but defaulting to +1 year if empty is a safe fallback
	if goal.TargetDate == "" {
		goal.TargetDate = time.Now().AddDate(1, 0, 0).Format("2006-01-02")
	}

	if err := repository.CreateGoal(goal); err != nil {
		http.Error(w, "Failed to create goal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Goal created successfully"}`))
}

func GetActivityHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// Fetch up to 100 recent activities for the dedicated page
	// NOTE: Requires importing personal-finance-backend/internal/dashboard
	// Actually to avoid circular imports, I should probably copy the Dashboard import to the top if needed.
	// We'll see.
	// Oh wait, handler uses repository. dashboard uses repository. Handler importing dashboard is fine since dashboard doesn't import handler.
	// Let's just import dashboard in financial_handler.go
	activities, err := dashboard.GetRecentActivity(userID, 100)
	if err != nil {
		http.Error(w, "Failed to fetch activities", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activities)
}

func GetInvestmentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID := r.Context().Value(middleware.UserIDKey).(int)

	investments, err := repository.GetInvestments(userID)
	if err != nil {
		http.Error(w, "Failed to fetch investments", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(investments)
}

type UpdateGoalRequest struct {
	GoalID       int     `json:"goal_id"`
	TargetAmount float64 `json:"target_amount"`
	TargetDate   string  `json:"target_date"`
}

func UpdateGoalHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)
	var req UpdateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if err := repository.UpdateGoal(userID, req.GoalID, req.TargetAmount, req.TargetDate); err != nil {
		http.Error(w, "Failed to update goal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Goal updated successfully"}`))
}

type DeleteActivityRequest struct {
	ID   int    `json:"id"`
	Type string `json:"type"`
}

func DeleteActivityHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)
	var req DeleteActivityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if err := repository.DeleteTransaction(userID, req.Type, req.ID); err != nil {
		http.Error(w, "Failed to delete transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Transaction deleted successfully"}`))
}

type resendAttachment struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

type resendEmailPayload struct {
	From        string             `json:"from"`
	To          []string           `json:"to"`
	Subject     string             `json:"subject"`
	HTML        string             `json:"html"`
	Attachments []resendAttachment `json:"attachments,omitempty"`
}

func sendPDFEmail(email, pdfBase64 string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not configured")
	}

	payload := resendEmailPayload{
		From:    "Zenora <insights@otp.zenoraapp.in>",
		To:      []string{email},
		Subject: "Your Zenora Financial Insights Report",
		HTML: `
			<div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
				<h2 style="color: #1e3a8a; margin-top: 0;">Your Zenora Insights Report is Ready</h2>
				<p>Hello,</p>
				<p>Please find your password-protected monthly financial insights report attached to this email.</p>
				<p>To open the PDF, use your secure profile password key (comprising the last 4 characters of your username followed by the 2-digit signup/current month, e.g. <code>****06</code>).</p>
				<p>If you did not request this report, please ignore this email or contact support.</p>
				<br/>
				<p>Best Regards,</p>
				<p><strong>Zenora Team</strong></p>
			</div>
		`,
		Attachments: []resendAttachment{
			{
				Filename: "Zenora-Financial-Insights.pdf",
				Content:  pdfBase64,
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var resendErr map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&resendErr)
		return fmt.Errorf("resend failed with status %d: %v", resp.StatusCode, resendErr)
	}

	return nil
}

type EmailReportRequest struct {
	PDFBase64 string `json:"pdf_base64"`
}

func EmailReportHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var req EmailReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.PDFBase64 == "" {
		http.Error(w, "Missing PDF data", http.StatusBadRequest)
		return
	}

	user, err := repository.GetUserByID(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve user details", http.StatusInternalServerError)
		return
	}

	if user.Email == "" {
		http.Error(w, "User email address is not registered", http.StatusBadRequest)
		return
	}

	if err := sendPDFEmail(user.Email, req.PDFBase64); err != nil {
		http.Error(w, "Failed to send email: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Report emailed successfully"}`))
}
