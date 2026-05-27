import { useState } from "react";
import { toast } from "../utils/toast";

function MLGraph() {
  const [plotHTML, setPlotHTML] = useState("");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("6");

  const [lastDate, setLastDate] = useState("");
  const [lastExpense, setLastExpense] = useState("");

  const userId = 1;

  const handlePredict = async () => {
    try {
      setPlotHTML("");
      setLastDate("");
      setLastExpense("");

      const res = await fetch(`${import.meta.env.VITE_ML_URL}/plot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          start_month: Number(start),
          end_month: Number(end),
        }),
      });

      const data = await res.json();
      console.log("API RESPONSE:", data);

      if (data.status === "success") {
        setPlotHTML(data.html || "");
        setLastDate(data.last_date || "");
        setLastExpense(
          data.last_expense ? Number(data.last_expense).toFixed(2) : ""
        );
      } else {
        toast.error("Backend error: " + data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching graph");
    }
  };

  const handleRetrain = async () => {
    try {
      await fetch(`${import.meta.env.VITE_ML_URL}/retrain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });

      toast.success("Model retrained successfully");
    } catch (err) {
      console.error(err);
      toast.error("Retrain failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 30px",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
      {/* TITLE */}
      <h1
        style={{
          fontSize: "42px",
          fontWeight: "700",
          marginBottom: "25px",
          letterSpacing: "1px",
        }}
      >
        Expense Prediction
      </h1>

      {/* INPUTS */}
      <div style={{ marginBottom: "20px" }}>

        <input
          type="number"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          placeholder="Months"
          style={{
            padding: "12px 20px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#0f172a",
            outline: "none",
            width: "140px",
            fontSize: "15px",
            fontWeight: "500",
            textAlign: "center",
            transition: "all 0.2s"
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#1e3a8a";
            e.target.style.boxShadow = "0 0 0 3px rgba(30, 58, 138, 0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#cbd5e1";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {/* BUTTONS */}
      <div style={{ marginBottom: "25px" }}>
        <button
          onClick={handlePredict}
          style={{
            marginRight: "12px",
            background: "linear-gradient(135deg, #1e3a8a, #fbbf24)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "30px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "15px",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(30, 58, 138, 0.15)",
          }}
        >
          Predict
        </button>

        <button
          onClick={handleRetrain}
          style={{
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "30px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "15px",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
          }}
        >
          Retrain
        </button>
      </div>

      {/* LAST VALUES CARD */}
      {lastDate && lastExpense && (
        <div
          style={{
            marginBottom: "25px",
            padding: "24px",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            display: "inline-block",
            minWidth: "280px",
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.03)",
          }}
        >
          <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "14px", fontWeight: "500" }}>
            Last Date
          </p>
          <p style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px" }}>
            {lastDate}
          </p>

          <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "14px", fontWeight: "500" }}>
            Last Expense
          </p>
          <p style={{ fontSize: "22px", fontWeight: "800", color: "#1e3a8a", margin: "0" }}>
            ₹{lastExpense}
          </p>
        </div>
      )}

      {/* GRAPH */}
      {plotHTML ? (
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            borderRadius: "20px",
            background: "#ffffff",
            boxShadow: "0 10px 25px rgba(30, 58, 138, 0.04)",
            border: "1px solid #e2e8f0",
            maxWidth: "1200px",
            marginInline: "auto",
          }}
        >
          <iframe
            key={plotHTML}
            srcDoc={plotHTML}
            width="100%"
            height="500px"
            style={{
              border: "none",
              borderRadius: "12px",
              display: "block",
            }}
          />
        </div>
      ) : (
        <p style={{ color: "#64748b", marginTop: "20px" }}>
          Click Predict to generate graph
        </p>
      )}
    </div>
  );
}

export default MLGraph;