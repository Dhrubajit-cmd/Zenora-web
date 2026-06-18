package handler

import (
	"encoding/json"
	"net/http"
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
