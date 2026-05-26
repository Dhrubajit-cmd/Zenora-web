package auth

import (
	"encoding/json"
	"net/http"

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
		http.Error(w, "User not found. Please sign up.", http.StatusNotFound)
		return
	}

	token, err := GenerateJWT(user.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

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
