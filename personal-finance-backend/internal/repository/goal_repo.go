package repository

import (
	"context"
	"fmt"
	"strings"
	"personal-finance-backend/internal/models"
	"personal-finance-backend/pkg/database"
)

func CreateGoal(goal models.Goal) error {
	query := `INSERT INTO goals (user_id, goal_name, target_amount, target_date) VALUES ($1, $2, $3, $4)`
	_, err := database.DB.Exec(context.Background(), query, goal.UserID, goal.GoalName, goal.TargetAmount, goal.TargetDate)
	return err
}

func CreateGoalsBatch(goals []models.Goal) error {
	if len(goals) == 0 {
		return nil
	}
	if len(goals) == 1 {
		return CreateGoal(goals[0])
	}

	valueStrings := make([]string, 0, len(goals))
	valueArgs := make([]interface{}, 0, len(goals)*4)

	for i, goal := range goals {
		offset := i * 4
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d)", offset+1, offset+2, offset+3, offset+4))
		valueArgs = append(valueArgs, goal.UserID, goal.GoalName, goal.TargetAmount, goal.TargetDate)
	}

	query := fmt.Sprintf("INSERT INTO goals (user_id, goal_name, target_amount, target_date) VALUES %s", strings.Join(valueStrings, ","))
	_, err := database.DB.Exec(context.Background(), query, valueArgs...)
	return err
}


func UpdateGoal(userID int, goalID int, targetAmount float64, targetDate string) error {
	query := `UPDATE goals SET target_amount = $1, target_date = $2 WHERE id = $3 AND user_id = $4`
	_, err := database.DB.Exec(context.Background(), query, targetAmount, targetDate, goalID, userID)
	return err
}

