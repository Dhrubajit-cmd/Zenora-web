import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Dashboard/dashboard.css"; 

function ActivityPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState({ isOpen: false, itemDesc: "" });
  const [overrideInput, setOverrideInput] = useState("");
  const [settingsModal, setSettingsModal] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/activity?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setActivities(json || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
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
        alert("Awesome! The AI has been permanently trained to understand this!");
        window.location.reload();
      } else {
        alert("Failed to override category.");
      }
    } catch(err) {
      alert("Network error.");
    }
  };

  return (
    <div className="dashboard-container">
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
              What is the CORRECT category for "<strong style={{color:"#0f172a"}}>{overrideModal.itemDesc}</strong>"?
            </p>
            <input 
              type="text" 
              placeholder="e.g. shopping, travel, utilities, food and drink"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
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
            background: "#ffffff", padding: "30px", borderRadius: "20px",
            width: "90%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0"
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
                Zenora Light Premium (Active)
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
                  style={{ padding: "12px 20px", background: "linear-gradient(135deg, #1e3a8a, #fbbf24)", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "15px" }}
                >
                  Sign Out
                </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-top">
          <h2 className="logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>FinTrack</h2>
          <ul className="menu">
            <li onClick={() => navigate("/dashboard")}>Dashboard</li>
            <li onClick={() => navigate("/transactions")}>Transactions</li>
            <li onClick={() => navigate("/investments")}>Investments</li>
            <li className="active">Activity</li>
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
      <div className="main-wrapper">        {/* HEADER */}
        <div className="header">
          <h2 style={{ margin: 0 }}>Activity Ledger</h2>
          <div className="profile" onClick={() => setSettingsModal(true)}>👤 User</div>
        </div>

        <div className="dashboard-body" style={{ flexDirection: "column" }}>
          
          <div className="card" style={{ width: "100%", padding: "30px", marginTop: "20px" }}>
            {loading ? (
               <p style={{ color: "#94a3b8" }}>Loading activities...</p>
            ) : activities.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#1e293b" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "12px" }}>Date</th>
                    <th style={{ padding: "12px" }}>Description</th>
                    <th style={{ padding: "12px" }}>Type</th>
                    <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act, idx) => {
                     let color = "#ef4444";
                     let prefix = "-";
                     if (act.type === "income") { color = "#22c55e"; prefix = "+"; }
                     if (act.type === "investment") { color = "#3b82f6"; prefix = "-"; }

                     return (
                       <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                         <td style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>
                            {new Date(act.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                         </td>
                         <td style={{ padding: "12px", fontWeight: "900", textTransform: "capitalize", color: "#0f172a" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                               <span>{act.description}</span>
                               {act.type === "expense" && act.category && (
                                   <span 
                                     onClick={() => handleEditCategory(act.description)}
                                     style={{ fontSize: "11px", background: "#fef2f2", padding: "3px 8px", borderRadius: "12px", color: "#ef4444", cursor: "pointer", border: "1px solid #fca5a5", width: "fit-content", marginTop: "6px", fontWeight: "bold" }}
                                     title="Teach the AI a new Category"
                                   >
                                     {act.category.replace(/_/g, ' ')} ✏️
                                   </span>
                               )}
                            </div>
                         </td>
                         <td style={{ padding: "12px", color: "#64748b", textTransform: "capitalize" }}>
                            {act.type}
                         </td>
                         <td style={{ padding: "12px", textAlign: "right", color: color, fontWeight: "bold" }}>
                            {prefix}₹{act.amount.toFixed(2)}
                         </td>
                       </tr>
                     );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#94a3b8" }}>No activity found.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default ActivityPage;
