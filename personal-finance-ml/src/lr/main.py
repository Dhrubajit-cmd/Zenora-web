import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from flask import Flask, request, jsonify
from src.lr.predict import predict_range
from src.lr.retrain import retrain
from src.lr.predict_plotly import generate_plot_html
from flask_cors import CORS
import plotly.graph_objects as go
import os


app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ML API running"})

@app.route("/plot", methods=["POST"])
def plot_api():
    try:
        data = request.json

        user_id = int(data.get("user_id", 1))
        start = int(data["start_month"])
        end = int(data["end_month"])

        html = generate_plot_html(user_id, start, end)

        return jsonify({
            "status": "success",
            "html": html
        })

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route("/plot", methods=["POST"])
def plot_graph():
    try:
        import plotly.graph_objects as go

        data = request.json

        start = int(data["start_month"])
        end = int(data["end_month"])
        user_id = int(data.get("user_id", 1))

        MODEL_PATH = "models/model.pkl"

        result = predict_range(MODEL_PATH, start, end, user_id)

        print("RESULT:", result)

        if "history_dates" not in result:
            return jsonify({"status": "error", "message": "Invalid data from predict"})

        fig = go.Figure()

        # Actual
        fig.add_trace(go.Scatter(
            x=result.get("history_dates", []),
            y=result.get("history_actual", []),
            mode="lines+markers",
            name="Actual",
            line=dict(color="#00E5FF", width=3, dash="dot"),
            marker=dict(size=6)
        ))

        # LR
        fig.add_trace(go.Scatter(
            x=result.get("history_dates", []),
            y=result.get("lr_line", []),
            mode="lines",
            name="Linear Regression",
            line=dict(color="#FF4D4D", width=4)
        ))

        # Prediction
        fig.add_trace(go.Scatter(
            x=result.get("future_dates", []),
            y=result.get("future_predicted", []),
            mode="lines",
            name="Prediction",
            line=dict(color="#FFA500", width=4)
        ))

        fig.update_layout(
            template="plotly_dark",
            title="Expense Prediction",
            xaxis_title="Date",
            yaxis_title="Amount"
        )

        html = fig.to_html(full_html=False)

        return jsonify({
            "status": "success",
            "html": html
        })

    except Exception as e:
        print("ERROR:", str(e)) 
        return jsonify({
            "status": "error",
            "message": str(e)
        })
@app.route("/retrain", methods=["POST"])
def retrain_api():
    try:
        data = request.json
        user_id = int(data.get("user_id", 1))

        message = retrain(user_id)

        return jsonify({"status": "success", "message": message})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)