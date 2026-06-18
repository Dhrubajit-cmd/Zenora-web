package repository

import (
	"context"
	"fmt"
	"strings"
	"personal-finance-backend/internal/models"
	"personal-finance-backend/pkg/database"
	"personal-finance-backend/pkg/crypto"
)

func CreateIncome(income models.Income) error {
	encryptedSource, err := crypto.Encrypt(income.Source, income.UserID)
	if err != nil {
		return err
	}
	query := `INSERT INTO incomes (user_id, source, amount, income_date) VALUES ($1, $2, $3, $4)`
	_, err = database.DB.Exec(context.Background(), query, income.UserID, encryptedSource, income.Amount, income.IncomeDate)
	return err
}

func CreateIncomesBatch(incomes []models.Income) error {
	if len(incomes) == 0 {
		return nil
	}
	if len(incomes) == 1 {
		return CreateIncome(incomes[0])
	}

	valueStrings := make([]string, 0, len(incomes))
	valueArgs := make([]interface{}, 0, len(incomes)*4)

	for i, inc := range incomes {
		encryptedSource, err := crypto.Encrypt(inc.Source, inc.UserID)
		if err != nil {
			return err
		}

		offset := i * 4
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d)", offset+1, offset+2, offset+3, offset+4))
		valueArgs = append(valueArgs, inc.UserID, encryptedSource, inc.Amount, inc.IncomeDate)
	}

	query := fmt.Sprintf("INSERT INTO incomes (user_id, source, amount, income_date) VALUES %s", strings.Join(valueStrings, ","))
	_, err := database.DB.Exec(context.Background(), query, valueArgs...)
	return err
}

