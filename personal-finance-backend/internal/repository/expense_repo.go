package repository

import (
	"context"
	"fmt"
	"strings"
	"personal-finance-backend/internal/models"
	"personal-finance-backend/pkg/database"
	"personal-finance-backend/pkg/crypto"
)

func CreateExpense(expense models.Expense) error {
	encryptedDesc, err := crypto.Encrypt(expense.Description, expense.UserID)
	if err != nil {
		return err
	}
	query := `INSERT INTO expenses (user_id, category, description, amount, expense_date) VALUES ($1, $2, $3, $4, $5)`
	_, err = database.DB.Exec(context.Background(), query, expense.UserID, expense.Category, encryptedDesc, expense.Amount, expense.ExpenseDate)
	return err
}

func CreateExpensesBatch(expenses []models.Expense) error {
	if len(expenses) == 0 {
		return nil
	}
	if len(expenses) == 1 {
		return CreateExpense(expenses[0])
	}

	valueStrings := make([]string, 0, len(expenses))
	valueArgs := make([]interface{}, 0, len(expenses)*5)

	for i, exp := range expenses {
		encryptedDesc, err := crypto.Encrypt(exp.Description, exp.UserID)
		if err != nil {
			return err
		}

		offset := i * 5
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d)", offset+1, offset+2, offset+3, offset+4, offset+5))
		valueArgs = append(valueArgs, exp.UserID, exp.Category, encryptedDesc, exp.Amount, exp.ExpenseDate)
	}

	query := fmt.Sprintf("INSERT INTO expenses (user_id, category, description, amount, expense_date) VALUES %s", strings.Join(valueStrings, ","))
	_, err := database.DB.Exec(context.Background(), query, valueArgs...)
	return err
}

