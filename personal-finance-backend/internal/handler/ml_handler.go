package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"personal-finance-backend/internal/middleware"
	"personal-finance-backend/internal/models"
	"personal-finance-backend/internal/repository"
)

// ================= EXISTING OVERRIDE HANDLER =================

func CreateOverrideHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.Context().Value(middleware.UserIDKey).(int)

	var override models.MLOverride
	if err := json.NewDecoder(r.Body).Decode(&override); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	rawTextLower := strings.ToLower(override.RawText)
	if err := repository.UpsertOverride(userID, rawTextLower, override.CorrectedCategory); err != nil {
		http.Error(w, "Failed to create ML override", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Override successfully trained into semantic memory!"}`))
}

// ================= ML PREDICTION =================

type PredictRequest struct {
	UserID     int `json:"user_id"`
	StartMonth int `json:"start_month"`
	EndMonth   int `json:"end_month"`
}

type PredictResponse struct {
	Status string                 `json:"status"`
	Data   map[string]interface{} `json:"data"`
}

// call Python ML API
func callMLAPI(req PredictRequest) ([]byte, error) {
	baseURL := os.Getenv("FASTAPI_ML_URL")
	if baseURL == "" {
		baseURL = "http://localhost:5000"
	}
	url := baseURL + "/predict"

	jsonData, _ := json.Marshal(req)

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return body, nil
}

// /api/ml/predict
func PredictMLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PredictRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	result, err := callMLAPI(req)
	if err != nil {
		http.Error(w, "ML API error", http.StatusInternalServerError)
		return
	}

	// unwrap response from Python
	var mlResp PredictResponse
	if err := json.Unmarshal(result, &mlResp); err != nil {
		http.Error(w, "Failed to parse ML response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if mlResp.Status == "success" {
		json.NewEncoder(w).Encode(mlResp.Data)
	} else {
		http.Error(w, "ML returned error", http.StatusInternalServerError)
	}
}

// ================= RETRAIN =================

// /api/ml/retrain
func RetrainMLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	baseURL := os.Getenv("FLASK_ML_URL")
	if baseURL == "" {
		baseURL = "http://localhost:5001"
	}
	url := baseURL + "/retrain"

	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		http.Error(w, "Retrain failed", http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}
