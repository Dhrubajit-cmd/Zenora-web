package ml

import "testing"

func TestPredictSpenderType(t *testing.T) {
	// Sample data for Saver
	saverBreakdown := map[string]float64{
		"food_and_drink":     1000,
		"rent":               5000,
		"utilities":          800,
		"entertainment":      500,
		"travel":             500,
		"health_and_fitness": 500,
		"shopping":           800,
		"other":              500,
	}
	res := PredictSpenderType(saverBreakdown)
	if res != "Saver" {
		t.Errorf("Expected Saver, got %s", res)
	}

	// Sample data for High Spender
	spenderBreakdown := map[string]float64{
		"food_and_drink":     35000,
		"rent":               45000,
		"utilities":          9000,
		"entertainment":      15000,
		"travel":             10000,
		"health_and_fitness": 12000,
		"shopping":           15000,
		"other":              12000,
	}
	res = PredictSpenderType(spenderBreakdown)
	if res != "High Spender" {
		t.Errorf("Expected High Spender, got %s", res)
	}
}
