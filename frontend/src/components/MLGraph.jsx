import { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import Plotly from "plotly.js-basic-dist";

function Plot({ data, layout, useResizeHandler, style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    Plotly.react(el, data, layout, { responsive: useResizeHandler });

    let resizeObserver;
    if (useResizeHandler) {
      resizeObserver = new ResizeObserver(() => {
        try {
          Plotly.Plots.resize(el);
        } catch (err) {
          console.warn("Plotly resize error:", err);
        }
      });
      resizeObserver.observe(el);
    }

    return () => {
      if (el) {
        Plotly.purge(el);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [data, layout, useResizeHandler]);

  return <div ref={containerRef} style={style} />;
}

function MLGraph() {
  const [loading, setLoading] = useState(true);
  const [dataPoints, setDataPoints] = useState([]);
  const [plotData, setPlotData] = useState(null);
  
  // Forecast horizon (default: predict next 3 months)
  const [predictHorizon, setPredictHorizon] = useState("3");

  // Fetch activities from Go API and cache them
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        // Try reading from cache first
        const cached = localStorage.getItem("zenora_activity_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          setDataPoints(parsed);
          calculateForecast(parsed, Number(predictHorizon));
          setLoading(false);
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/activity`, {
          credentials: "include"
        });

        if (res.ok) {
          const json = await res.json();
          // Cache the response
          localStorage.setItem("zenora_activity_cache", JSON.stringify(json));
          setDataPoints(json);
          calculateForecast(json, Number(predictHorizon));
        } else {
          if (!cached) toast.error("Failed to load transactions history.");
        }
      } catch (err) {
        console.error("Error loading activities:", err);
        if (!localStorage.getItem("zenora_activity_cache")) {
          toast.error("Network error reaching server.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Run calculation when horizon changes
  useEffect(() => {
    if (dataPoints.length > 0) {
      calculateForecast(dataPoints, Number(predictHorizon));
    }
  }, [predictHorizon, dataPoints]);

  // Client-Side Linear Regression logic (replaces python predict.py)
  const calculateForecast = (activities, futureSteps) => {
    // 1. Filter and keep only expenses
    const expenses = activities.filter(act => act.type === "expense");
    if (expenses.length === 0) {
      setPlotData({ error: "No expense data found to forecast. Record some expenses first!" });
      return;
    }

    // 2. Group expenses by month (YYYY-MM)
    const monthlyMap = {};
    expenses.forEach(exp => {
      const dateStr = exp.date; // format: "2026-06-19" or ISO string
      if (!dateStr) return;
      const monthKey = dateStr.substring(0, 7); // "YYYY-MM"
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + exp.amount;
    });

    // Sort months chronologically
    const months = Object.keys(monthlyMap).sort();
    if (months.length === 0) {
      setPlotData({ error: "No historical monthly totals found." });
      return;
    }

    const historyActual = months.map(m => monthlyMap[m]);
    const historyDates = months.map(m => `${m}-01`); // YYYY-MM-01 for chart dates

    const N = months.length;
    const X = Array.from({ length: N }, (_, i) => i);
    const Y = historyActual;

    // 3. Calculate Linear Regression fit coefficients (Y = mX + c)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < N; i++) {
      sumX += X[i];
      sumY += Y[i];
      sumXY += X[i] * Y[i];
      sumXX += X[i] * X[i];
    }

    const denominator = N * sumXX - sumX * sumX;
    let m = 0;
    let c = 0;
    if (denominator !== 0) {
      m = (N * sumXY - sumX * sumY) / denominator;
      c = (sumY - m * sumX) / N;
    } else {
      m = 0;
      c = N > 0 ? sumY / N : 0;
    }

    const lrLine = X.map(x => m * x + c);

    // 4. Forecast future periods
    const futureDates = [];
    const futurePredicted = [];
    const lastDateVal = new Date(historyDates[historyDates.length - 1]);

    for (let k = 1; k <= futureSteps; k++) {
      const nextDate = new Date(lastDateVal.getFullYear(), lastDateVal.getMonth() + k, 1);
      const dateString = nextDate.toISOString().split("T")[0];
      futureDates.push(dateString);

      const futureIdx = N + k - 1;
      const predVal = m * futureIdx + c;
      futurePredicted.push(predVal);
    }

    // Align prediction line seamlessly with historical regression line
    if (futurePredicted.length > 0 && lrLine.length > 0) {
      const offset = lrLine[lrLine.length - 1] - futurePredicted[0];
      for (let i = 0; i < futurePredicted.length; i++) {
        futurePredicted[i] += offset;
      }
    }

    const lastDate = futureDates.length > 0 ? futureDates[futureDates.length - 1] : historyDates[historyDates.length - 1];
    const lastExpense = futurePredicted.length > 0 ? futurePredicted[futurePredicted.length - 1] : historyActual[historyActual.length - 1];

    setPlotData({
      history_dates: historyDates,
      history_actual: historyActual,
      lr_line: lrLine,
      future_dates: futureDates,
      future_predicted: futurePredicted,
      last_date: lastDate,
      last_expense: lastExpense,
      slope: m
    });
  };

  const handleRetrain = () => {
    // Since training is fully local, click to retrain just recomputes the math instantly!
    if (dataPoints.length > 0) {
      calculateForecast(dataPoints, Number(predictHorizon));
      toast.success("Model retrained successfully on-device! ⚡");
    } else {
      toast.error("No transaction data available to train.");
    }
  };

  // Format month name cleanly (e.g. "2026-06-01" -> "Jun 2026")
  const formatMonthName = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (loading) {
    // Premium Skeleton Card Loader
    return (
      <div className="card" style={{ height: "450px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#ffffff", gap: "15px" }}>
        <div style={{ width: "200px", height: "24px", background: "#e2e8f0", borderRadius: "6px" }} />
        <div style={{ width: "300px", height: "14px", background: "#e2e8f0", borderRadius: "6px" }} />
        <div style={{ width: "100px", height: "40px", background: "#e2e8f0", borderRadius: "20px" }} />
      </div>
    );
  }

  if (plotData && plotData.error) {
    return (
      <div className="card" style={{ padding: "40px 20px", textAlign: "center", background: "#ffffff" }}>
        <h3 style={{ color: "#64748b", fontSize: "16px", fontWeight: "600", margin: 0 }}>{plotData.error}</h3>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: "30px",
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* HEADER WITH CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
        <div style={{ textAlign: "left" }}>
          <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>Expense Predictor</h4>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Horizon</span>
            <div 
              title="The number of future months you want the regression model to forecast." 
              style={{
                width: "14px", height: "14px", borderRadius: "50%", background: "#e2e8f0",
                color: "#475569", fontSize: "10px", fontWeight: "bold", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "help",
              }}
            >
              i
            </div>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>:</span>
          </div>
          <input
            type="number"
            min="1"
            max="12"
            value={predictHorizon}
            onChange={(e) => setPredictHorizon(e.target.value)}
            placeholder="Months"
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              outline: "none",
              width: "65px",
              fontSize: "13px",
              fontWeight: "600",
              textAlign: "center",
            }}
          />
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>months</span>

          <button
            onClick={handleRetrain}
            style={{
              background: "linear-gradient(135deg, #1e3a8a, #fbbf24)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "30px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "12px",
              boxShadow: "0 4px 10px rgba(30, 58, 138, 0.1)",
            }}
          >
            Retrain
          </button>
        </div>
      </div>

      {/* METRICS & GRAPH GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        
        {/* FORECAST METRICS SUMMARY */}
        {plotData && (
          <div
            style={{
              padding: "16px 24px",
              borderRadius: "14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
              textAlign: "left"
            }}
          >
            <div>
              <p style={{ margin: "0 0 2px", color: "#64748b", fontSize: "12px", fontWeight: "600" }}>
                FORECAST TARGET
              </p>
              <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "0" }}>
                {formatMonthName(plotData.last_date)}
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", color: "#64748b", fontSize: "12px", fontWeight: "600" }}>
                PREDICTED SPEND
              </p>
              <p style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a8a", margin: "0" }}>
                ₹{Number(plotData.last_expense).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "20px" }}>
              <p style={{ margin: "0 0 2px", color: "#64748b", fontSize: "12px", fontWeight: "600" }}>
                TREND DIRECTION
              </p>
              <span style={{ fontSize: "13px", fontWeight: "700", color: plotData.slope > 0 ? "#ef4444" : "#22c55e" }}>
                {plotData.slope > 0 ? "📈 Upward" : "📉 Downward"} ({plotData.slope > 0 ? "+" : ""}₹{plotData.slope.toFixed(0)}/mo)
              </span>
            </div>
          </div>
        )}

        {/* PLOTLY NATIVE GRAPH */}
        {plotData && (
          <div
            style={{
              padding: "10px",
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              height: "350px",
              width: "100%",
              overflow: "hidden"
            }}
          >
            <Plot
              data={[
                {
                  x: plotData.history_dates,
                  y: plotData.history_actual,
                  type: "scatter",
                  mode: "lines+markers",
                  name: "Actual Spending",
                  marker: { size: 6, color: "#fbbf24" }, // Zenora Gold
                  line: { color: "#fbbf24", width: 2.5, dash: "dot" }
                },
                {
                  x: plotData.history_dates,
                  y: plotData.lr_line,
                  type: "scatter",
                  mode: "lines",
                  name: "Regression Fit",
                  line: { color: "#1e3a8a", width: 2.5 } // Zenora Deep Navy
                },
                ...(plotData.future_dates.length > 0 ? [{
                  x: plotData.future_dates,
                  y: plotData.future_predicted,
                  type: "scatter",
                  mode: "lines+markers",
                  name: "Future Projection",
                  marker: { size: 6, color: "#10b981" }, // Emerald Teal/Green
                  line: { color: "#10b981", width: 2.5 }
                }] : [])
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: "#ffffff",
                plot_bgcolor: "#ffffff",
                xaxis: {
                  type: "date",
                  tickformat: "%b %Y",
                  gridcolor: "#f1f5f9",
                  linecolor: "#e2e8f0",
                  tickfont: { size: 10 }
                },
                yaxis: {
                  gridcolor: "#f1f5f9",
                  linecolor: "#e2e8f0",
                  tickfont: { size: 10 }
                },
                legend: { orientation: "h", y: -0.15, x: 0.5, xanchor: "center" },
                margin: { l: 40, r: 20, t: 15, b: 40 },
                font: { family: "'Inter', sans-serif", color: "#475569" }
              }}
              useResizeHandler={true}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        )}
      </div>

      {/* DISCLAIMER / CAUTION */}
      <div style={{
        borderTop: "1px solid #f1f5f9",
        paddingTop: "12px",
        marginTop: "10px",
        textAlign: "left",
        fontSize: "11px",
        color: "#94a3b8",
        lineHeight: "1.5"
      }}>
        <strong>Disclaimer:</strong> Forecasts are mathematical estimations calculated locally on your device via linear regression of historical spending. Actual expenditures may vary due to changes in spending behavior, variable pricing, or unexpected financial transactions.
      </div>
    </div>
  );
}

export default MLGraph;