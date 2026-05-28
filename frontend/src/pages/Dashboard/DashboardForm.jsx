import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, BarChart, Bar, XAxis, Tooltip as BarTooltip } from "recharts";
import logo from "../../assets/logo/logo.png";
import { toast } from "../../utils/toast";
import "./dashboard.css";

function DashboardForm() {
  const navigate = useNavigate();
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem("zenora_dashboard_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem("zenora_dashboard_cache");
  });
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, itemDesc: "" });
  const [overrideInput, setOverrideInput] = useState("");
  const [settingsModal, setSettingsModal] = useState(false);
  const [goalEditModal, setGoalEditModal] = useState({ isOpen: false, goal: null, amount: "", date: "" });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, id: null, type: null });

  const getSpenderColor = (type) => {
    if (!type) return "#38bdf8"; // Fallback blue
    const normalized = type.toLowerCase();
    if (normalized.includes("saver")) return "#22c55e"; // Vivid Green
    if (normalized.includes("balanced")) return "#f59e0b"; // Golden Yellow / Orange
    if (normalized.includes("high spender") || normalized.includes("spender")) return "#ef4444"; // Bold Red
    return "#38bdf8"; // Default analyzing blue
  };

  const fetchDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const json = await res.json();
      localStorage.setItem("zenora_dashboard_cache", JSON.stringify(json));
      setData(json);
    } catch (err) {
      console.error("Dashboard cache sync error:", err);
      if (!data) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("zenora_dashboard_cache");
    navigate("/");
  };

  const handleEditCategory = (rawText) => {
    setOverrideModal({ isOpen: true, itemDesc: rawText });
    setOverrideInput("");
  };

  const submitEditCategory = async () => {
    const rawText = overrideModal.itemDesc;
    const override = overrideInput;
    if (!override || override.trim() === "") return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ml/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: rawText,
          corrected_category: override.toLowerCase().replace(/ /g, "_")
        })
      });
      if (res.ok) {
        toast.success("Awesome! The AI has been permanently trained to understand this!");
        setOverrideModal({ isOpen: false, itemDesc: "" });
        setOverrideInput("");
        fetchDashboard();
      } else {
        toast.error("Failed to override category.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  const submitGoalEdit = async () => {
    const token = localStorage.getItem("token");
    if (!goalEditModal.amount || !goalEditModal.date) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/goals/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goal_id: goalEditModal.goal.id,
          target_amount: parseFloat(goalEditModal.amount),
          target_date: goalEditModal.date
        })
      });
      if (res.ok) {
        toast.success("Goal Target updated successfully!");
        setGoalEditModal({ isOpen: false, goal: null, amount: "", date: "" });
        fetchDashboard();
      } else {
        toast.error("Failed to update goal.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const promptDeleteTransaction = (id, type) => {
    setDeleteConfirmModal({ isOpen: true, id, type });
  };

  const executeDeleteTransaction = async () => {
    const { id, type } = deleteConfirmModal;
    if (!id || !type) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/activity/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id, type })
      });
      if (res.ok) {
        setDeleteConfirmModal({ isOpen: false, id: null, type: null });
        fetchDashboard();
      } else {
        toast.error("Failed to delete transaction.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ alignItems: "center", justifyContent: "center", color: "white" }}>
        <h2>Loading your financial intelligence...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container" style={{ alignItems: "center", justifyContent: "center", color: "#FF4D4D" }}>
        <h2>Error: {error}</h2>
        <button onClick={handleLogout} style={{ padding: "10px", marginTop: "10px" }}>Return to Login</button>
      </div>
    );
  }

  // Formatting for Charts
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
  const pieData = Object.entries(data?.expense_breakdown || {})
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  // Filtering Logic for Real-Time Search
  const filteredActivity = data?.recent_activity?.filter((act) => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return (
      act.description.toLowerCase().includes(lowerQ) ||
      act.type.toLowerCase().includes(lowerQ) ||
      act.amount.toString().includes(lowerQ)
    );
  }) || [];

  // Truncate to 5 if no search active
  const displayActivity = searchQuery ? filteredActivity : filteredActivity.slice(0, 5);

  return (
    <div className="dashboard-container">
      {/* REACT CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", padding: "30px", borderRadius: "16px",
            width: "90%", maxWidth: "420px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #cbd5e1"
          }}>
            <h3 style={{ margin: "0 0 12px", color: "#b91c1c", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ Delete Transaction
            </h3>
            <p style={{ margin: "0 0 25px", color: "#475569", fontSize: "14px", lineHeight: "1.6" }}>
              Are you sure you want to delete this transaction? Operations and analytics will automatically rebalance.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, id: null, type: null })}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteTransaction}
                style={{
                  padding: "10px 24px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)"
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE REACT ML MODAL UI */}
      {overrideModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", padding: "30px", borderRadius: "16px",
            width: "90%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <h3 style={{ margin: "0 0 10px", color: "#0f172a" }}>Teach the AI!</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px" }}>
              What is the CORRECT category for "<strong style={{ color: "#0f172a" }}>{overrideModal.itemDesc}</strong>"?
            </p>
            <input
              type="text"
              placeholder="e.g. shopping, travel, utilities, food and drink"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submitEditCategory();
                }
              }}
              style={{
                width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px",
                marginBottom: "20px", outline: "none", fontSize: "14px", boxSizing: "border-box"
              }}
              autoFocus
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setOverrideModal({ isOpen: false, itemDesc: "" })}
                style={{ padding: "10px 16px", background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Cancel
              </button>
              <button
                onClick={submitEditCategory}
                style={{ padding: "10px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                Save AI Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REACT SETTINGS MODAL */}
      {settingsModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#f4efe8", padding: "30px", borderRadius: "20px",
            width: "90%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <h3 style={{ margin: "0 0 5px", color: "#0f172a", fontSize: "22px" }}>Account Settings</h3>
            <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "14px" }}>Manage your profile and platform preferences.</p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Profile Identity</label>
              <div style={{ background: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#1e293b", fontWeight: "500", display: "flex", justifyContent: "space-between" }}>
                <span>User Account</span>
                <span style={{ color: "#3b82f6" }}>Active</span>
              </div>
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Visual Theme</label>
              <div style={{ background: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#1e293b", fontWeight: "500" }}>
                Moniex Deep Indigo (Active)
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setSettingsModal(false)}
                style={{ padding: "12px 20px", background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "15px" }}
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                style={{ padding: "12px 20px", background: "#191c2b", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "15px" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REACT GOALS MODAL */}
      {goalEditModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", padding: "30px", borderRadius: "16px",
            width: "90%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <h3 style={{ margin: "0 0 10px", color: "#0f172a" }}>Edit Target Goal</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "14px", textTransform: "capitalize" }}>
              <strong style={{ color: "#0f172a" }}>{goalEditModal.goal.goal_name}</strong>
            </p>

            <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: "500", fontSize: "13px" }}>New Target Amount</label>
            <input
              type="number"
              value={goalEditModal.amount}
              onChange={(e) => setGoalEditModal({ ...goalEditModal, amount: e.target.value })}
              style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "15px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
            />

            <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: "500", fontSize: "13px" }}>New Deadline Date</label>
            <input
              type="date"
              value={goalEditModal.date}
              onChange={(e) => setGoalEditModal({ ...goalEditModal, date: e.target.value })}
              style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "25px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setGoalEditModal({ isOpen: false, goal: null, amount: "", date: "" })}
                style={{ padding: "10px 16px", background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontWeight: "600" }}
              >
                Cancel
              </button>
              <button
                onClick={submitGoalEdit}
                style={{ padding: "10px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                Update Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-top">
          <h2 className="logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={logo} alt="Zenora Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            Zenora
          </h2>
          <ul className="menu">
            <li className="active">Dashboard</li>
            <li onClick={() => navigate("/transactions")} style={{ cursor: "pointer" }}>Transactions</li>
            <li onClick={() => navigate("/investments")} style={{ cursor: "pointer" }}>Investments</li>
            <li onClick={() => navigate("/activity")} style={{ cursor: "pointer" }}>Activity</li>
          </ul>
        </div>

        <div className="sidebar-bottom">
          <ul className="menu">
            <li className="sidebar-action" onClick={() => setSettingsModal(true)} style={{ cursor: "pointer" }}>Settings</li>
            <li className="sidebar-action" onClick={handleLogout} style={{ cursor: "pointer" }}>Logout</li>
          </ul>
        </div>
      </div>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">

        {/* HEADER */}
        <div className="header">
          <input
            type="text"
            placeholder="Search transactions..."
            className="search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="profile" onClick={() => setSettingsModal(true)}>👤 User</div>
        </div>

        {/* DASHBOARD BODY */}
        <div className="dashboard-body">

          {/* LEFT COLUMN: MAIN CONTENT */}
          <div className="main-content">

            <div className="cards">
              <div className="card">
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Current Balance</p>
                <h2 style={{ margin: "5px 0", color: "#0f172a" }}>₹{data?.current_balance?.toFixed(2) || "0.00"}</h2>
              </div>
              <div className="card">
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Net Worth</p>
                <h2 style={{ margin: "5px 0", color: "#22c55e" }}>₹{data?.total_net_worth?.toFixed(2) || "0.00"}</h2>
              </div>
              <div className="card">
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Total Investments</p>
                <h2 style={{ margin: "5px 0", color: "#3b82f6" }}>₹{data?.total_investments?.toFixed(2) || "0.00"}</h2>
              </div>
            </div>

            <div className="charts">
              <div className="chart-box" style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <h4>Expense Breakdown</h4>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <PieTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "15px" }}>No expenses recorded yet.</p>
                )}

                <ul style={{ listStyle: "none", padding: 0, marginTop: "15px" }}>
                  {pieData.map((item, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ textTransform: "capitalize", color: "#475569", fontSize: "14px" }}>
                        <span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: COLORS[i % COLORS.length], borderRadius: "50%", marginRight: "8px" }}></span>
                        {item.name}
                      </span>
                      <strong style={{ color: "#ef4444", fontSize: "14px" }}>₹{item.value.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="chart-box" style={{ overflowY: "auto" }}>
                <h4>Saving Goals</h4>
                {data?.active_goals && data.active_goals.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: "15px" }}>
                    {data.active_goals.map((g, i) => (
                      <li key={i} style={{
                        marginBottom: "12px",
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}>
                        <p style={{ margin: "0 0 5px", fontSize: "14px", fontWeight: "600", color: "#1e293b", textTransform: "capitalize", display: "flex", justifyContent: "space-between" }}>
                          <span>{g.goal_name}</span>
                          <span
                            onClick={() => setGoalEditModal({ isOpen: true, goal: g, amount: g.target_amount.toString(), date: g.target_date })}
                            style={{ fontSize: "11px", background: "#eff6ff", padding: "2px 8px", borderRadius: "10px", color: "#3b82f6", cursor: "pointer", border: "1px dashed #bfdbfe", fontWeight: "bold" }}
                            title="Edit Target Goal"
                          >
                            Edit Target
                          </span>
                        </p>
                        <p style={{ margin: "0", fontSize: "12px", color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>Deadline: {g.target_date ? new Date(g.target_date).toLocaleDateString() : "None"}</span>
                          <span style={{ color: "#0ea5e9", fontWeight: "bold", fontSize: "14px" }}>₹{g.target_amount.toLocaleString()}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "15px" }}>No active goals.</p>
                )}
              </div>
            </div>

            <div className="cashflow">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4>Total Expenses</h4>
                  <h2 style={{ margin: "5px 0", color: "#ef4444" }}>₹{data?.total_expenses?.toFixed(2) || "0.00"}</h2>
                  <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Monthly Burn Rate: ₹{data?.monthly_burn_rate?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
              <div style={{ marginTop: "20px", height: "140px", width: "100%" }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={40} stroke="#94a3b8" />
                      <BarTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#94a3b8", fontSize: "13px" }}>Not enough data for chart.</p>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: SIDE PANEL */}
          <div className="right-panel">

            <div className="side-card ml-card" style={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              alignItems: "center", 
              textAlign: "center", 
              minHeight: "95px",
              padding: "16px 20px",
              flex: "none"
            }}>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>AI Spending Behavior</p>
              <h2 style={{ 
                margin: "6px 0 0 0", 
                color: getSpenderColor(data?.ml_spender_type), 
                fontSize: "24px",
                fontWeight: "800"
              }}>
                {data?.ml_spender_type || "Analyzing..."}
              </h2>
            </div>

            <div className="side-card" style={{ overflowY: "auto", flex: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4>Recent Activity</h4>
                {searchQuery && <span style={{ fontSize: "12px", color: "#3b82f6", background: "#eff6ff", padding: "2px 8px", borderRadius: "10px" }}>Filtered</span>}
              </div>

              <ul style={{ listStyle: "none", padding: 0, marginTop: "15px" }}>
                {displayActivity.length > 0 ? (
                  displayActivity.map((act, i) => {
                    let color = "#ef4444";
                    let prefix = "-";
                    if (act.type === "income") { color = "#22c55e"; prefix = "+"; }
                    if (act.type === "investment") { color = "#3b82f6"; prefix = "-"; }

                    return (
                      <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ flex: 1, paddingRight: "10px" }}>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "900", color: "#0f172a", textTransform: "capitalize" }}>{act.description}</p>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px", flexWrap: "wrap" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                              {new Date(act.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                            {act.type === "expense" && act.category && (
                              <span
                                onClick={() => handleEditCategory(act.description)}
                                style={{ fontSize: "11px", background: "#fef2f2", padding: "3px 8px", borderRadius: "12px", color: "#ef4444", cursor: "pointer", border: "1px solid #fca5a5", fontWeight: "bold" }}
                                title="Teach the AI a new Category"
                              >
                                {act.category.replace(/_/g, ' ')} ✏️
                              </span>
                            )}
                            <span
                              onClick={() => promptDeleteTransaction(act.id, act.type)}
                              style={{ fontSize: "11px", background: "#fef2f2", padding: "3px 8px", borderRadius: "12px", color: "#b91c1c", cursor: "pointer", border: "1px solid #fecaca", fontWeight: "bold" }}
                              title="Delete Transaction"
                            >
                              🗑️ Delete
                            </span>
                          </div>
                        </div>
                        <strong style={{ alignSelf: "center", color: color, fontSize: "15px" }}>{prefix}₹{act.amount.toFixed(2)}</strong>
                      </li>
                    )
                  })
                ) : (
                  <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "10px" }}>
                    {searchQuery ? "No matching records." : "No recent activity tracked."}
                  </p>
                )}
              </ul>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}

export default DashboardForm;