import { useState } from "react";

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
        alert("Backend error: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching graph");
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

      alert("Model retrained successfully");
    } catch (err) {
      console.error(err);
      alert("Retrain failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        color: "white",
        fontFamily: "sans-serif",
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
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "white",
            outline: "none",
            width: "120px",
          }}
          onFocus={(e) => (e.target.style.border = "1px solid #3b82f6")}
          onBlur={(e) => (e.target.style.border = "1px solid #334155")}
        />
      </div>

      {/* BUTTONS */}
      <div style={{ marginBottom: "25px" }}>
        <button
          onClick={handlePredict}
          style={{
            marginRight: "10px",
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          Retrain
        </button>
      </div>

      {/* LAST VALUES CARD */}
      {lastDate && lastExpense && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "12px",
            background: "#020617",
            border: "1px solid #1e293b",
            display: "inline-block",
            minWidth: "250px",
          }}
        >
          <p style={{ margin: "5px 0", color: "#94a3b8" }}>
            Last Date
          </p>
          <p style={{ fontSize: "18px", fontWeight: "bold" }}>
            {lastDate}
          </p>

          <p style={{ margin: "10px 0 5px", color: "#94a3b8" }}>
            Last Expense
          </p>
          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#22c55e" }}>
            ₹{lastExpense}
          </p>
        </div>
      )}

      {/* GRAPH */}
      {plotHTML ? (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            borderRadius: "16px",
            background: "#020617",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            border: "1px solid #1e293b",
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