package main

import (
	"log"
	"net/http"

	"github.com/joho/godotenv"

	"personal-finance-backend/pkg/database"

	"personal-finance-backend/internal/auth"

	"personal-finance-backend/internal/middleware"

	"personal-finance-backend/internal/dashboard"

	"personal-finance-backend/internal/handler"
)

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

		if r.Method == "OPTIONS" {
			return
		}

		next.ServeHTTP(w, r)
	})
}
func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	err = database.ConnectDB()
	if err != nil {
		log.Fatal("Error connecting to the database")
	}
	log.Println("Server running on : 8080")

	http.HandleFunc("/auth/register", auth.RegisterHandler)
	http.HandleFunc("/auth/login", auth.LoginHandler)
	http.HandleFunc("/auth/otp-login", auth.OTPLoginHandler)
	http.HandleFunc("/api/profile", middleware.AuthMiddleware(auth.ProfileHandler))
	http.HandleFunc("/api/dashboard", middleware.AuthMiddleware(dashboard.DashboardHandler))
	mux := http.NewServeMux()

	//  Auth routes
	mux.HandleFunc("/auth/register", auth.RegisterHandler)
	mux.HandleFunc("/auth/login", auth.LoginHandler)
	mux.HandleFunc("/auth/otp-login", auth.OTPLoginHandler)

	//  Google OAuth
	mux.HandleFunc("/auth/google/login", auth.GoogleLoginHandler)
	mux.HandleFunc("/auth/google/callback", auth.GoogleCallbackHandler)

	//  Protected routes
	mux.HandleFunc("/api/profile", middleware.AuthMiddleware(auth.ProfileHandler))
	mux.HandleFunc("/api/dashboard", middleware.AuthMiddleware(dashboard.DashboardHandler))

	//  Onboarding + Finance routes
	mux.HandleFunc("/api/onboarding", middleware.AuthMiddleware(handler.OnboardingBatchHandler))
	mux.HandleFunc("/api/expenses", middleware.AuthMiddleware(handler.CreateExpenseHandler))
	mux.HandleFunc("/api/incomes", middleware.AuthMiddleware(handler.CreateIncomeHandler))
	mux.HandleFunc("/api/investments", middleware.AuthMiddleware(handler.CreateInvestmentHandler))
	mux.HandleFunc("/api/investments/all", middleware.AuthMiddleware(handler.GetInvestmentsHandler))
	mux.HandleFunc("/api/goals", middleware.AuthMiddleware(handler.CreateGoalHandler))
	mux.HandleFunc("/api/goals/update", middleware.AuthMiddleware(handler.UpdateGoalHandler))
	mux.HandleFunc("/api/activity", middleware.AuthMiddleware(handler.GetActivityHandler))
	mux.HandleFunc("/api/activity/delete", middleware.AuthMiddleware(handler.DeleteActivityHandler))

	//  ML Override (NEW from incoming)
	mux.HandleFunc("/api/ml/override", middleware.AuthMiddleware(handler.CreateOverrideHandler))
	mux.HandleFunc("/api/ml/predict", handler.PredictMLHandler)
	mux.HandleFunc("/api/ml/retrain", handler.RetrainMLHandler)

	//  Server start
	http.ListenAndServe(":8080", enableCORS(mux))
}
