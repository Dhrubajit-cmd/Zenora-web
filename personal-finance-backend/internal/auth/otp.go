package auth

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

type otpEntry struct {
	OTP     string
	Expires time.Time
}

var (
	otpStore sync.Map // maps email (string) to otpEntry
)

// Regex pattern for validating email format
var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// generateOTP generates a secure random 6-digit OTP
func generateOTP() (string, error) {
	max := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

// sendOTPEmail sends the generated OTP via the Resend API
func sendOTPEmail(email, otp string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return errors.New("RESEND_API_KEY is not configured")
	}

	payload := resendPayload{
		From:    "Zenora <otp@otp.zenoraapp.in>",
		To:      []string{email},
		Subject: "OTP Verification for Zenora",
		HTML: fmt.Sprintf(`<h2>Your OTP for verification is: %s</h2>
             <p> This OTP will expire in 5 minutes</p>
             <p> Do not share this OTP with anyone</p>
             <p> If you did not request this OTP, please ignore this email</p>
             <p> Thank you for using Zenora</p>
             <p>Zenora Team</p>
            `, otp),
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

	client := &http.Client{Timeout: 10 * time.Second}
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

type SendOTPRequest struct {
	Email string `json:"email"`
}

type SendOTPResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// SendOTPHandler generates and sends the OTP to the specified email address
func SendOTPHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SendOTPRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(SendOTPResponse{Success: false, Message: "Invalid request body"})
		return
	}

	trimmedEmail := strings.TrimSpace(req.Email)
	if trimmedEmail == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(SendOTPResponse{Success: false, Message: "Email is required"})
		return
	}

	if !emailRegex.MatchString(trimmedEmail) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(SendOTPResponse{Success: false, Message: "Invalid email format"})
		return
	}

	otp, err := generateOTP()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(SendOTPResponse{Success: false, Message: "Failed to generate OTP"})
		return
	}

	// Store OTP in-memory with a 5-minute expiry
	otpStore.Store(trimmedEmail, otpEntry{
		OTP:     otp,
		Expires: time.Now().Add(5 * time.Minute),
	})

	err = sendOTPEmail(trimmedEmail, otp)
	if err != nil {
		fmt.Printf("Error sending OTP email to %s: %v\n", trimmedEmail, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(SendOTPResponse{Success: false, Message: "Failed to send OTP: " + err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SendOTPResponse{Success: true})
}

type VerifyOTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

type VerifyOTPResponse struct {
	Verified bool   `json:"verified"`
	Message  string `json:"message,omitempty"`
}

// VerifyOTPHandler verifies if the provided OTP matches the stored OTP and has not expired
func VerifyOTPHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyOTPRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VerifyOTPResponse{Verified: false, Message: "Invalid request body"})
		return
	}

	trimmedEmail := strings.TrimSpace(req.Email)
	trimmedOTP := strings.TrimSpace(req.OTP)

	if trimmedEmail == "" || trimmedOTP == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VerifyOTPResponse{Verified: false, Message: "Email and OTP are required"})
		return
	}

	val, found := otpStore.Load(trimmedEmail)
	if !found {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(VerifyOTPResponse{Verified: false, Message: "OTP not found or expired"})
		return
	}

	entry := val.(otpEntry)

	if entry.OTP != trimmedOTP {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(VerifyOTPResponse{Verified: false, Message: "Invalid OTP"})
		return
	}

	if time.Now().After(entry.Expires) {
		otpStore.Delete(trimmedEmail) // Clean up expired OTP
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(VerifyOTPResponse{Verified: false, Message: "OTP expired"})
		return
	}

	// OTP is verified successfully! Delete it to prevent reuse/replay attacks
	otpStore.Delete(trimmedEmail)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(VerifyOTPResponse{Verified: true})
}
