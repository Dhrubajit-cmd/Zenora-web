package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"

	"golang.org/x/crypto/hkdf"
)

var masterKey []byte

// LoadMasterKey loads and validates the MASTER_ENCRYPTION_KEY from env
func LoadMasterKey() error {
	keyStr := os.Getenv("MASTER_ENCRYPTION_KEY")
	if keyStr == "" {
		return errors.New("MASTER_ENCRYPTION_KEY env variable is required but not set")
	}
	// We hash the env key so any length string resolves to a cryptographically strong 32-byte key
	hash := sha256.Sum256([]byte(keyStr))
	masterKey = hash[:]
	return nil
}

// DeriveKey derives a unique 32-byte user-specific encryption key using HKDF
func DeriveKey(userID int) ([]byte, error) {
	if len(masterKey) == 0 {
		if err := LoadMasterKey(); err != nil {
			return nil, err
		}
	}

	// Use user-specific ID to derive a distinct key for each user
	salt := []byte("zenora-user-salt-" + strconv.Itoa(userID))
	info := []byte("zenora-user-key-derivation")

	hkdfReader := hkdf.New(sha256.New, masterKey, salt, info)

	userKey := make([]byte, 32) // 32 bytes for AES-256
	if _, err := io.ReadFull(hkdfReader, userKey); err != nil {
		return nil, fmt.Errorf("failed to derive user key: %w", err)
	}

	return userKey, nil
}

// Encrypt encrypts a plaintext string using AES-256-GCM and the derived key for the userID
func Encrypt(plaintext string, userID int) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	key, err := DeriveKey(userID)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts an AES-256-GCM encrypted base64 string using the derived key for the userID
func Decrypt(cryptoText string, userID int) (string, error) {
	if cryptoText == "" {
		return "", nil
	}

	key, err := DeriveKey(userID)
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
