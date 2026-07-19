package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"personal-finance-backend/pkg/crypto"
	"personal-finance-backend/pkg/database"

	"personal-finance-backend/internal/auth"

	"personal-finance-backend/internal/middleware"

	"personal-finance-backend/internal/dashboard"

	"personal-finance-backend/internal/handler"
)

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// 🛡️ Strict Whitelist of Authorized Origins
		allowedOrigins := map[string]bool{
			"http://localhost:5173":    true,
			"https://app.zenoraapp.in": true,
			"https://api.zenoraapp.in": true,
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			// Fallback: Always allow credentials for the production React client securely
			w.Header().Set("Access-Control-Allow-Origin", "https://app.zenoraapp.in")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
func main() {

	// Load local .env file if present, but ignore error in cloud environment (like Render)
	_ = godotenv.Load()

	// Initialize envelope encryption master key
	if err := crypto.LoadMasterKey(); err != nil {
		log.Fatal("Error loading encryption key: ", err)
	}

	err := database.ConnectDB()
	if err != nil {
		log.Fatal("Error connecting to the database: ", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server running on port %s\n", port)

	mux := http.NewServeMux()

	//  Health check routes
	mux.HandleFunc("/health", auth.HealthHandler)
	mux.HandleFunc("/api/health", auth.HealthHandler)

	//  Auth routes
	mux.HandleFunc("/auth/register", auth.RegisterHandler)
	mux.HandleFunc("/auth/login", auth.LoginHandler)
	mux.HandleFunc("/auth/otp-login", auth.OTPLoginHandler)
	mux.HandleFunc("/auth/logout", auth.LogoutHandler)
	mux.HandleFunc("/auth/send-otp", auth.SendOTPHandler)
	mux.HandleFunc("/auth/verify-otp", auth.VerifyOTPHandler)

	//  Google OAuth
	mux.HandleFunc("/auth/google/login", auth.GoogleLoginHandler)
	mux.HandleFunc("/auth/google/callback", auth.GoogleCallbackHandler)

	//  Protected routes
	mux.HandleFunc("/api/profile", middleware.AuthMiddleware(auth.ProfileHandler))
	mux.HandleFunc("/api/dashboard", middleware.AuthMiddleware(dashboard.DashboardHandler))

	//  Onboarding + Finance routes
	mux.HandleFunc("/api/onboarding", middleware.AuthMiddleware(handler.OnboardingBatchHandler))
	mux.HandleFunc("/api/expenses", middleware.AuthMiddleware(handler.CreateExpenseHandler))
	mux.HandleFunc("/api/expenses/batch", middleware.AuthMiddleware(handler.CreateExpensesBatchHandler))
	mux.HandleFunc("/api/incomes", middleware.AuthMiddleware(handler.CreateIncomeHandler))
	mux.HandleFunc("/api/investments", middleware.AuthMiddleware(handler.CreateInvestmentHandler))
	mux.HandleFunc("/api/investments/all", middleware.AuthMiddleware(handler.GetInvestmentsHandler))
	mux.HandleFunc("/api/goals", middleware.AuthMiddleware(handler.CreateGoalHandler))
	mux.HandleFunc("/api/goals/update", middleware.AuthMiddleware(handler.UpdateGoalHandler))
	mux.HandleFunc("/api/activity", middleware.AuthMiddleware(handler.GetActivityHandler))
	mux.HandleFunc("/api/activity/delete", middleware.AuthMiddleware(handler.DeleteActivityHandler))
	mux.HandleFunc("/api/insights/email-report", middleware.AuthMiddleware(handler.EmailReportHandler))

	//  ML Override (NEW from incoming)
	mux.HandleFunc("/api/ml/override", middleware.AuthMiddleware(handler.CreateOverrideHandler))

	//  Server start
	http.ListenAndServe(":"+port, enableCORS(middleware.RateLimitMiddleware(mux)))
}
