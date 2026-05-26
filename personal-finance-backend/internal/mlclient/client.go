package mlclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

func PredictSpender(input ExpenseInput) (*PredictionData, error) {

	// 1 : Encode the input data to JSON :
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}

	// 2 : Create HTTP Client :
	client := &http.Client{Timeout: 10 * time.Second}

	// 3: Create HTTP Request with dynamic cloud URL :
	baseURL := os.Getenv("FASTAPI_ML_URL")
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8000"
	}
	url := baseURL + "/predict/spender-type"

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	// 4. Send Request :
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 5. Decode Response :
	var mlResp MLResponse
	if err := json.NewDecoder(resp.Body).Decode(&mlResp); err != nil {
		return nil, err
	}

	// 6. Handle ML-Level Errors :
	if mlResp.Status != "success" || mlResp.Data == nil {
		return nil, fmt.Errorf("ML Prediction Failed: %v", mlResp.Error)
	}
	return mlResp.Data, nil
}

type CategorizeReq struct {
	Strings []string `json:"strings"`
}

type CategorizeRes struct {
	Results []string `json:"results"`
}

func CategorizeExpense(input string) string {
	payload, _ := json.Marshal(CategorizeReq{Strings: []string{input}})
	client := &http.Client{Timeout: 5 * time.Second}
	
	baseURL := os.Getenv("FASTAPI_ML_URL")
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8000"
	}
	url := baseURL + "/predict/categorize"

	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := client.Do(req)
	if err != nil {
		return "other" // Fallback classification if Python server is unreachable
	}
	defer resp.Body.Close()

	var mlResp CategorizeRes
	if err := json.NewDecoder(resp.Body).Decode(&mlResp); err == nil && len(mlResp.Results) > 0 {
		return mlResp.Results[0]
	}
	return "other"
}
