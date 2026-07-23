package database

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func ConnectDB() error {
	databaseURL := os.Getenv("DATABASE_URL")

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return err
	}

	if err := pool.Ping(context.Background()); err != nil {
		return err
	}
	DB = pool
	fmt.Println("Connected to PostgreSQL database successfully.")

	// Auto-migrate schema
	_, migrationErr := DB.Exec(context.Background(), "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';")
	if migrationErr != nil {
		fmt.Println("Migration notice:", migrationErr)
	}
	DB.Exec(context.Background(), "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
	DB.Exec(context.Background(), "ALTER TABLE incomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
	DB.Exec(context.Background(), "ALTER TABLE investments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
	DB.Exec(context.Background(), "ALTER TABLE incomes ALTER COLUMN source TYPE TEXT;")
	return nil
}
