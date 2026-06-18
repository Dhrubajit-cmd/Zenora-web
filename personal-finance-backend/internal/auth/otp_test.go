package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestOTPStoreAndVerify(t *testing.T) {
	email := "test@zenoraapp.in"
	otp, err := generateOTP()
	if err != nil {
		t.Fatalf("Failed to generate OTP: %v", err)
	}

	if len(otp) != 6 {
		t.Errorf("Expected 6-digit OTP, got %s", otp)
	}

	// Store OTP
	otpStore.Store(email, otpEntry{
		OTP:     otp,
		Expires: time.Now().Add(5 * time.Minute),
	})

	// Verify correct OTP
	val, found := otpStore.Load(email)
	if !found {
		t.Fatalf("Expected OTP to be stored")
	}

	entry := val.(otpEntry)
	if entry.OTP != otp {
		t.Errorf("Stored OTP mismatch: expected %s, got %s", otp, entry.OTP)
	}

	// Clean up
	otpStore.Delete(email)
}

func TestVerifyOTPHandler(t *testing.T) {
	email := "user@example.com"
	otp := "123456"

	// Preset the store
	otpStore.Store(email, otpEntry{
		OTP:     otp,
		Expires: time.Now().Add(5 * time.Minute),
	})

	// 1. Success case
	reqBody, _ := json.Marshal(VerifyOTPRequest{
		Email: email,
		OTP:   otp,
	})
	req := httptest.NewRequest("POST", "/auth/verify-otp", bytes.NewBuffer(reqBody))
	rr := httptest.NewRecorder()

	VerifyOTPHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", rr.Code)
	}

	var resp VerifyOTPResponse
	_ = json.NewDecoder(rr.Body).Decode(&resp)
	if !resp.Verified {
		t.Errorf("Expected verified=true, got false")
	}

	// Verify it was cleaned up
	_, found := otpStore.Load(email)
	if found {
		t.Errorf("Expected OTP entry to be deleted after success validation")
	}

	// 2. Expired case
	otpStore.Store(email, otpEntry{
		OTP:     otp,
		Expires: time.Now().Add(-1 * time.Minute),
	})

	reqBody, _ = json.Marshal(VerifyOTPRequest{
		Email: email,
		OTP:   otp,
	})
	req = httptest.NewRequest("POST", "/auth/verify-otp", bytes.NewBuffer(reqBody))
	rr = httptest.NewRecorder()

	VerifyOTPHandler(rr, req)

	resp = VerifyOTPResponse{}
	_ = json.NewDecoder(rr.Body).Decode(&resp)
	if resp.Verified {
		t.Errorf("Expected verified=false for expired OTP")
	}

	// 3. Incorrect code case
	otpStore.Store(email, otpEntry{
		OTP:     otp,
		Expires: time.Now().Add(5 * time.Minute),
	})

	reqBody, _ = json.Marshal(VerifyOTPRequest{
		Email: email,
		OTP:   "999999",
	})
	req = httptest.NewRequest("POST", "/auth/verify-otp", bytes.NewBuffer(reqBody))
	rr = httptest.NewRecorder()

	VerifyOTPHandler(rr, req)

	resp = VerifyOTPResponse{}
	_ = json.NewDecoder(rr.Body).Decode(&resp)
	if resp.Verified {
		t.Errorf("Expected verified=false for incorrect OTP")
	}
}
