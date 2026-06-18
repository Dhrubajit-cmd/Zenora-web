package repository

import (
	"context"
	"fmt"
	"strings"
	"personal-finance-backend/internal/models"
	"personal-finance-backend/pkg/database"
	"personal-finance-backend/pkg/crypto"
)

func CreateInvestment(investment models.Investment) error {
	encryptedAsset, err := crypto.Encrypt(investment.AssetType, investment.UserID)
	if err != nil {
		return err
	}
	query := `INSERT INTO investments (user_id, asset_type, amount, investment_date) VALUES ($1, $2, $3, $4)`
	_, err = database.DB.Exec(context.Background(), query, investment.UserID, encryptedAsset, investment.Amount, investment.InvestmentDate)
	return err
}

func CreateInvestmentsBatch(investments []models.Investment) error {
	if len(investments) == 0 {
		return nil
	}
	if len(investments) == 1 {
		return CreateInvestment(investments[0])
	}

	valueStrings := make([]string, 0, len(investments))
	valueArgs := make([]interface{}, 0, len(investments)*4)

	for i, inv := range investments {
		encryptedAsset, err := crypto.Encrypt(inv.AssetType, inv.UserID)
		if err != nil {
			return err
		}

		offset := i * 4
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d)", offset+1, offset+2, offset+3, offset+4))
		valueArgs = append(valueArgs, inv.UserID, encryptedAsset, inv.Amount, inv.InvestmentDate)
	}

	query := fmt.Sprintf("INSERT INTO investments (user_id, asset_type, amount, investment_date) VALUES %s", strings.Join(valueStrings, ","))
	_, err := database.DB.Exec(context.Background(), query, valueArgs...)
	return err
}


func GetInvestments(userID int) ([]models.Investment, error) {
	query := `SELECT id, user_id, asset_type, amount, COALESCE(investment_date::TEXT, '') FROM investments WHERE user_id=$1 ORDER BY investment_date DESC`
	rows, err := database.DB.Query(context.Background(), query, userID)
	if err != nil {
		return []models.Investment{}, err
	}
	defer rows.Close()

	var invs []models.Investment
	for rows.Next() {
		var i models.Investment
		if err := rows.Scan(&i.ID, &i.UserID, &i.AssetType, &i.Amount, &i.InvestmentDate); err == nil {
			if dec, errDec := crypto.Decrypt(i.AssetType, userID); errDec == nil {
				i.AssetType = dec
			}
			invs = append(invs, i)
		}
	}
	return invs, nil
}

