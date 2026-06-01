package auth

import (
	"encoding/json"
	"net/http"
	"os"

	"personal-finance-backend/internal/models"

	"personal-finance-backend/internal/middleware"

	"personal-finance-backend/internal/repository"
)

type RegisterRequest struct {
	UserName string `json:"user_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	Password string `json:"password"`
	Currency string `json:"currency"`
}

type LoginRequest struct {
	Identifier string `json:"identifier"` // can be email or username
	Password   string `json:"password"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user := models.User{
		UserName: req.UserName,
		Email:    req.Email,
		Phone:    req.Phone,
		Address:  req.Address,
		Currency: req.Currency,
	}

	userID, err := RegisterUser(&user, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"message": "User registered successfully",
		"user_id": userID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	token, err := LoginUser(req.Identifier, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	setTokenCookie(w, token) // Write secure HttpOnly Cookie

	response := map[string]interface{}{
		"message": "Login successful",
		"token":   token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

type OTPLoginRequest struct {
	Email string `json:"email"`
}

func OTPLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req OTPLoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user, err := repository.GetUserByEmailOrUsername(req.Email)
	if err != nil {
		// User does not exist! Automatically register/sign up the user
		username := req.Email
		for i, char := range req.Email {
			if char == '@' {
				username = req.Email[:i]
				break
			}
		}

		newUser := models.User{
			UserName: username,
			Email:    req.Email,
			Currency: "USD",
		}

		userID, createErr := repository.CreateUser(&newUser)
		if createErr != nil {
			http.Error(w, "Failed to automatically register user: "+createErr.Error(), http.StatusInternalServerError)
			return
		}

		user = &newUser
		user.UserID = userID
	}

	token, err := GenerateJWT(user.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	setTokenCookie(w, token) // Write secure HttpOnly Cookie

	response := map[string]interface{}{
		"message": "Login successful",
		"token":   token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}


func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Get user_id from context :
	userID := r.Context().Value(middleware.UserIDKey).(int)

	user, err := repository.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	response := map[string]interface{}{
		"user_id":   user.UserID,
		"user_name": user.UserName,
		"email":     user.Email,
		"currency":  user.Currency,
	}

	json.NewEncoder(w).Encode(response)

}

func setTokenCookie(w http.ResponseWriter, token string) {
	// For secure same-site subdomain sharing, use SameSite=Lax and Secure=true
	secure := true

	cookieDomain := os.Getenv("COOKIE_DOMAIN")

	cookie := &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7 days in seconds
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}

	if cookieDomain != "" {
		cookie.Domain = cookieDomain
	}

	http.SetCookie(w, cookie)
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	cookieDomain := os.Getenv("COOKIE_DOMAIN")

	cookie := &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1, // Instantly expire cookie
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}

	if cookieDomain != "" {
		cookie.Domain = cookieDomain
	}

	http.SetCookie(w, cookie)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Logged out successfully"}`))
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy"}`))
}
