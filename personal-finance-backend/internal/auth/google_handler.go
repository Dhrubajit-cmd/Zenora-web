package auth

import (
	"encoding/json"
	"net/http"
	"os"

	"personal-finance-backend/internal/models"
	"personal-finance-backend/internal/repository"
)

// 🔹 Redirect user to Google
func GoogleLoginHandler(w http.ResponseWriter, r *http.Request) {
	config := GetGoogleOAuthConfig()

	url := config.AuthCodeURL("state-token")
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// 🔹 Handle Google callback
func GoogleCallbackHandler(w http.ResponseWriter, r *http.Request) {
	config := GetGoogleOAuthConfig()

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	// 🔁 Exchange code for token
	token, err := config.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 👤 Get user info from Google
	client := config.Client(r.Context(), token)

	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		http.Error(w, "Failed to decode user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 📧 Extract email safely
	email, ok := userInfo["email"].(string)
	if !ok {
		http.Error(w, "Email not found", http.StatusInternalServerError)
		return
	}

	println("Google user:", email)

	// 👤 Check if user exists, if not, create them!
	user, err := repository.GetUserByEmailOrUsername(email)
	var userID int
	if err != nil {
		// User does not exist! Automatically register/sign up the user
		username := email
		for i, char := range email {
			if char == '@' {
				username = email[:i]
				break
			}
		}

		googleIDStr := ""
		if id, ok := userInfo["id"].(string); ok {
			googleIDStr = id
		}

		newUser := models.User{
			UserName:     username,
			Email:        email,
			GoogleID:     &googleIDStr,
			AuthProvider: "google",
			Currency:     "USD",
		}

		userID, err = repository.CreateGoogleUser(&newUser)
		if err != nil {
			http.Error(w, "Failed to automatically register Google user: "+err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		userID = user.UserID
	}

	jwtToken, err := GenerateJWT(userID)
	if err != nil {
		http.Error(w, "Failed to generate JWT: "+err.Error(), http.StatusInternalServerError)
		return
	}

	setTokenCookie(w, jwtToken) // Write secure HttpOnly Cookie

	// Redirect back to React Frontend with token query parameter as a secure fallback
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	
	// Append token parameter for frontend auto-login fallback
	redirectTarget := frontendURL + "?token=" + jwtToken
	http.Redirect(w, r, redirectTarget, http.StatusTemporaryRedirect)
}