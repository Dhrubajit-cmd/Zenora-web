package crypto

import (
	"os"
	"testing"
)

func TestCryptoRoundTrip(t *testing.T) {
	// Setup env var for test
	os.Setenv("MASTER_ENCRYPTION_KEY", "super-secret-test-master-key-12345")
	defer os.Unsetenv("MASTER_ENCRYPTION_KEY")

	// Reset state
	masterKey = nil

	userID := 42
	plaintext := "Hello Zenora! This is a secret message containing phone: +919876543210 and address: 123 Finance Street."

	// Encrypt
	ciphertext, err := Encrypt(plaintext, userID)
	if err != nil {
		t.Fatalf("Failed to encrypt: %v", err)
	}

	if ciphertext == plaintext {
		t.Errorf("Ciphertext should not match plaintext")
	}

	// Decrypt
	decrypted, err := Decrypt(ciphertext, userID)
	if err != nil {
		t.Fatalf("Failed to decrypt: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("Decrypted text mismatch: expected %q, got %q", plaintext, decrypted)
	}

	// Verify key derivation is user-dependent (User 42 cannot decrypt User 43's data)
	anotherUserID := 43
	_, err = Decrypt(ciphertext, anotherUserID)
	if err == nil {
		t.Errorf("Expected decryption to fail when using a different UserID key derivation")
	}
}
