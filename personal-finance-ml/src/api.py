from fastapi import FastAPI
from pydantic import BaseModel 
from typing import Dict, List
from src.inference import predict_spender_type
from fastapi import HTTPException, status 
from src.lightweight_classifier import LightweightClassifier

app = FastAPI(
    title="Personal Finance ML API", 
    description="Spending Behaviour Prediction Service",  
    version="1.0.0"
)

# Initialize Lightweight Classifier (Uses <15MB RAM and 0ms latency)
classifier = LightweightClassifier()

EXPENSE_CATEGORIES = [
    "food_and_drink",
    "rent",
    "utilities",
    "entertainment",
    "travel",
    "health_and_fitness",
    "shopping",
    "other"
]

CLEAN_CATEGORIES = [
    "food and drink",
    "rent",
    "utilities",
    "entertainment",
    "travel",
    "health and fitness",
    "shopping",
    "other"
]

LABEL_MAP = {clean: raw for clean, raw in zip(CLEAN_CATEGORIES, EXPENSE_CATEGORIES)}

class CategorizeInput(BaseModel):
    strings: List[str]

class CategorizeOutput(BaseModel):
    results: List[str]

@app.post("/predict/categorize", response_model=CategorizeOutput, status_code=status.HTTP_200_OK)
def categorize_expense(data: CategorizeInput):
    try:
        results = []
        # Process strings one by one against the 8 categories
        for text in data.strings:
            category = classifier.classify(text)
            results.append(category)
        return {"results": results}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# -----------------------------
# INPUT SCHEMA (VALIDATION)
# -----------------------------
class ExpenseInput(BaseModel): 
    food_and_drink: float 
    rent: float
    utilities: float 
    entertainment: float 
    travel: float
    health_and_fitness: float
    shopping: float
    other: float 


# ----------------------------
# OUTPUT SCHEMA 
# ----------------------------
class PredictionResponse(BaseModel): 
    status: str
    data: dict | None 
    error: dict | None 


# -----------------------------
# API ENDPOINT 
# -----------------------------

@app.post("/predict/spender-type", 
            response_model=PredictionResponse,
            status_code=status.HTTP_200_OK
          )
def predict_spender(data: ExpenseInput): 
    """
    Takes monthly expense data 
    Returns spending behaviour 
    """

    # Business Validation :
    total_expense = (
        data.food_and_drink + 
        data.rent + 
        data.utilities + 
        data.entertainment + 
        data.travel + 
        data.health_and_fitness + 
        data.shopping + 
        data.other 
    ) 
    if total_expense <= 0: 
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Total expense must be greater than zero."
        )
    try: 
       # Convert API KEYS to ML KEYS : 
       ml_input = {
        "food & drink": data.food_and_drink,
        "rent": data.rent,
        "utilities": data.utilities,
        "entertainment": data.entertainment,
        "travel": data.travel,
        "health & fitness": data.health_and_fitness,
        "shopping": data.shopping,
        "other": data.other,
       }
       
       result = predict_spender_type(ml_input)
       
       return {
        "status": "success", 
        "data": result,
        "error": None
       }
    except Exception as e: 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e) 
        )
    

    