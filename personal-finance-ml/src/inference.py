# pyrefly: ignore [missing-import]
import joblib 
import pandas as pd 
import os 

# Load saved model dynamically: 
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(os.path.dirname(CURRENT_DIR), 'models')

kmeans = joblib.load(os.path.join(MODEL_DIR, 'kmeans_model.pkl'))
scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))

# Same features used during training : 
FEATURES = [
    "food & drink", "rent", "utilities", "entertainment", "travel", "health & fitness", "shopping", "other"]

# Cluster -> Human label mapping : 
CLUSTER_LABELS = {
    0: "Saver", 
    1: "Balanced", 
    2: "High Spender"
}

# Inference Function : 
def predict_spender_type(input_data: dict) -> dict : 
    """
    Docstring for predict_spender_type
    
    Input data example : 
    {
        "food & drink": 5000, 
        "rent": 15000, 
        "utilities": 3000, 
        "entertainment": 2000, 
        "travel": 4000, 
        "health & fitness": 2500, 
        "shopping": 3500, 
        "other": 1500, 
    }
    """

    # Convert JSON -> DataFrame (1 row): 
    df = pd.DataFrame([input_data]) 

    # Ensure correct feature order : 
    df = df[FEATURES] 

    # IMPORTANT : only transform, no fitting : 
    X_scaled = scaler.transform(df)

    # Predict cluster : 
    cluster = int(kmeans.predict(X_scaled)[0])

    # Convert cluster -> readable label : 
    spender_type = CLUSTER_LABELS.get(cluster, "Unknown")

    return {
        "cluster": cluster, 
        "spender_type": spender_type
    }

# -----------------------------
# LOCAL TEST (DEBUG ONLY)
# -----------------------------
if __name__ == "__main__" :
    sample_input = {
        "food & drink": 5000, 
        "rent": 15000, 
        "utilities": 3000, 
        "entertainment": 2000, 
        "travel": 4000, 
        "health & fitness": 2500, 
        "shopping": 3500, 
        "other": 1500, 
    }

    result = predict_spender_type(sample_input)
    print("Prediction Result: ", result)