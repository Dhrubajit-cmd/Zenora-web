package repository

import (
	"context"
	"errors"
	"fmt"

	"personal-finance-backend/pkg/database"

	"personal-finance-backend/internal/models"
)

/* Get User by Email or Username

Used during LOGIN

Flow:
1. User enters email or username
2. Backend searches DB
3. If found -> return user
4. If not found -> return error
*/

func GetUserByEmailOrUsername(identifier string) (*models.User, error) {
	query := `Select user_id, user_name, email, COALESCE(phone, ''), COALESCE(address, ''), COALESCE(password_hashed, ''), COALESCE(currency, 'USD'), google_id, auth_provider, COALESCE(age, 0) from users where email=$1 or user_name=$1 LIMIT 1`
	row := database.DB.QueryRow(context.Background(), query, identifier)

	var user models.User
	err := row.Scan(
		&user.UserID,
		&user.UserName,
		&user.Email,
		&user.Phone,
		&user.Address,
		&user.PasswordHashed,
		&user.Currency,
		&user.GoogleID,
		&user.AuthProvider,
		&user.Age,
	)
	if err != nil {
		fmt.Printf("Login scan error: %v\n", err)
		return nil, errors.New("user not found")
	}
	return &user, nil
}

/* Create User

Used during SIGNUP

Steps :
1. Hash password (handeled in service layer)
2. Insert user into DB
3. Return created user ID
*/

func CreateUser(user *models.User) (int, error) {
	query := `Insert into users (user_name, email, phone, address, password_hashed, currency, auth_provider) values ($1,$2,$3,$4,$5,$6,'local') returning user_id`

	var userID int

	err := database.DB.QueryRow(context.Background(), query, user.UserName, user.Email, user.Phone, user.Address, user.PasswordHashed, user.Currency).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

/* Create Google User

Used when a user logs in with Google for the first time.
*/

func CreateGoogleUser(user *models.User) (int, error) {
	query := `Insert into users (user_name, email, google_id, auth_provider) values ($1,$2,$3,'google') returning user_id`

	var userID int

	err := database.DB.QueryRow(context.Background(), query, user.UserName, user.Email, user.GoogleID).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

// Create a function GetUserByID :
func GetUserByID(userID int) (*models.User, error) {

	query := `
	 Select user_id, user_name, email, COALESCE(phone, ''), COALESCE(address, ''), COALESCE(password_hashed, ''), COALESCE(currency, 'USD'), google_id, auth_provider, COALESCE(age, 0), created_at
	 from users where user_id=$1
	`

	row := database.DB.QueryRow(context.Background(), query, userID)

	var user models.User

	err := row.Scan(
		&user.UserID,
		&user.UserName,
		&user.Email,
		&user.Phone,
		&user.Address,
		&user.PasswordHashed,
		&user.Currency,
		&user.GoogleID,
		&user.AuthProvider,
		&user.Age,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

// UpdateUserAge sets a user's age during onboarding/profile update
func UpdateUserAge(userID int, age int) error {
	query := `UPDATE users SET age=$1 WHERE user_id=$2`
	_, err := database.DB.Exec(context.Background(), query, age, userID)
	return err
}
