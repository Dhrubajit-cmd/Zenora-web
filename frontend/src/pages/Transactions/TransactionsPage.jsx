import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo/logo.png";
import { toast } from "../../utils/toast";
import "../Dashboard/dashboard.css"; // Reuse dashboard styling

function TransactionsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("expense");
  const [loading, setLoading] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [settingsModal, setSettingsModal] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem("zenora_profile_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [profileDropdown, setProfileDropdown] = useState(false);

  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return "U";
    let clean = nameOrEmail.trim();
    if (clean.includes("@")) {
      clean = clean.split("@")[0];
    }
    const parts = clean.split(/[\s._-]+/);
    if (parts.length === 0) return "U";
    if (parts.length === 1) {
      return parts[0].substring(0, Math.min(parts[0].length, 2)).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        localStorage.setItem("zenora_profile_cache", JSON.stringify(json));
        setProfile(json);
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("zenora_dashboard_cache");
    localStorage.removeItem("zenora_activity_cache");
    localStorage.removeItem("zenora_profile_cache");
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;

    setLoading(true);
    const token = localStorage.getItem("token");
    
    let endpoint = "";
    let payload = {};

    if (activeTab === "expense") {
      endpoint = `${import.meta.env.VITE_API_URL}/api/expenses`;
      payload = { amount: parseFloat(amount), description: description };
    } else if (activeTab === "income") {
      endpoint = `${import.meta.env.VITE_API_URL}/api/incomes`;
      payload = { amount: parseFloat(amount), source: description };
    } else if (activeTab === "investment") {
      endpoint = `${import.meta.env.VITE_API_URL}/api/investments`;
      payload = { amount: parseFloat(amount), asset_type: description };
    } else if (activeTab === "goal") {
      endpoint = `${import.meta.env.VITE_API_URL}/api/goals`;
      payload = { target_amount: parseFloat(amount), goal_name: description, target_date: targetDate };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Transaction added successfully!");
        setAmount("");
        setDescription("");
      } else {
        const errorData = await res.text();
        toast.error("Failed to add transaction: " + errorData);
      }
    } catch (err) {
      toast.error("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-top">
          <h2 className="logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={logo} alt="Zenora Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            Zenora
          </h2>
          <ul className="menu">
            <li onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>Dashboard</li>
            <li className="active">Transactions</li>
            <li onClick={() => navigate("/investments")} style={{ cursor: "pointer" }}>Investments</li>
            <li onClick={() => navigate("/activity")} style={{ cursor: "pointer" }}>Activity</li>
          </ul>
        </div>
        
        {/* BOTTOM ANCHORED LINKS */}
        <div className="sidebar-bottom">
          <ul className="menu">
            <li className="sidebar-action" onClick={() => setSettingsModal(true)} style={{ cursor: "pointer" }}>Settings</li>
            <li className="sidebar-action" onClick={handleLogout} style={{ cursor: "pointer" }}>Logout</li>
          </ul>
        </div>
      </div>

      {/* SETTINGS / PROFILE MODAL */}
      {settingsModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", padding: "30px", borderRadius: "20px",
            width: "90%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0"
          }}>
            <h3 style={{ margin: "0 0 5px", color: "#0f172a", fontSize: "22px" }}>Account Settings</h3>
            <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "14px" }}>Manage your profile and platform preferences.</p>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Profile Identity</label>
              <div style={{ background: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#1e293b", fontWeight: "500", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Username</span>
                  <span>{profile?.user_name || "User Account"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                  <span style={{ color: "#64748b" }}>Email Address</span>
                  <span>{profile?.email || "Active"}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>Visual Theme</label>
              <div style={{ background: "white", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#1e293b", fontWeight: "500" }}>
                Zenora Premium Light (Active)
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
                  style={{ padding: "12px 20px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "15px", boxShadow: "0 4px 12px rgba(30, 58, 138, 0.15)" }}
                >
                  Sign Out
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        <div className="header">
          <h2 style={{ margin: 0 }}>Add Transaction</h2>
          {/* USER AVATAR WITH DROPDOWN */}
          <div style={{ position: "relative" }}>
            <div 
              className="avatar-circle" 
              onClick={() => setProfileDropdown(!profileDropdown)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#0ea5e9",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(14, 165, 233, 0.2)",
                transition: "transform 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {getInitials(profile?.user_name || profile?.email || "User")}
            </div>

            {profileDropdown && (
              <div style={{
                position: "absolute",
                top: "50px",
                right: "0",
                width: "280px",
                background: "white",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                border: "1px solid #e2e8f0",
                zIndex: 1000,
                overflow: "hidden",
                fontFamily: "'Inter', sans-serif"
              }}>
                {/* Header Section */}
                <div 
                  onClick={() => { setProfileDropdown(false); setSettingsModal(true); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "20px",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                >
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#0ea5e9",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    marginRight: "12px"
                  }}>
                    {getInitials(profile?.user_name || profile?.email || "User")}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ margin: 0, fontWeight: "700", color: "#0f172a", fontSize: "14px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {profile?.user_name || "Zenora User"}
                    </p>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>View Profile</span>
                  </div>
                  <span style={{ color: "#64748b", fontWeight: "700", fontSize: "16px" }}>&gt;</span>
                </div>

                {/* Options List */}
                <div style={{ padding: "8px 0" }}>
                  <div 
                    onClick={() => { setProfileDropdown(false); setSettingsModal(true); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#0f172a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#475569"; }}
                  >
                    <span style={{ marginRight: "12px", fontSize: "16px" }}>👤</span>
                    View Profile
                  </div>

                  <div 
                    onClick={() => { setProfileDropdown(false); toast.info("Zenora Support: Email us at support@zenoraapp.in 🚀"); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#0f172a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#475569"; }}
                  >
                    <span style={{ marginRight: "12px", fontSize: "16px" }}>💬</span>
                    Need Help?
                  </div>

                  <div 
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#ef4444",
                      transition: "background 0.2s",
                      borderTop: "1px solid #f1f5f9"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                  >
                    <span style={{ marginRight: "12px", fontSize: "16px" }}>🚪</span>
                    Logout
                  </div>

                  <div 
                    onClick={() => { 
                      setProfileDropdown(false); 
                      if (window.confirm("CAUTION: Are you absolutely sure you want to permanently delete your Zenora account? This action is irreversible.")) {
                        toast.error("Account deletion requested. Please contact administrative support to confirm.");
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#ef4444",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                  >
                    <span style={{ marginRight: "12px", fontSize: "16px" }}>🗑️</span>
                    Delete Account
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-body" style={{ flexDirection: "column", alignItems: "center" }}>
          
          <div className="card" style={{ width: "100%", maxWidth: "600px", padding: "30px", marginTop: "20px" }}>
            
            {/* TABS */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "25px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
              {["expense", "income", "investment", "goal"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    background: activeTab === tab ? "#1e3a8a" : "transparent",
                    color: activeTab === tab ? "white" : "#64748b",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: "500" }}>
                  {activeTab === "goal" ? "Target Amount (₹)" : "Amount (₹)"}
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  style={{
                    width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1",
                    fontSize: "16px", boxSizing: "border-box", outline: "none", background: "white", color: "#1e293b"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: "500" }}>
                  {activeTab === "expense" ? "Description (e.g. Zara Clothing)" :
                   activeTab === "income" ? "Source (e.g. Freelance Client)" :
                   activeTab === "investment" ? "Asset Type (e.g. S&P 500)" :
                   "Goal Name (e.g. Travel Fund)"}
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Type here..."
                  style={{
                    width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1",
                    fontSize: "16px", boxSizing: "border-box", outline: "none", background: "white", color: "#1e293b"
                  }}
                />
                {activeTab === "expense" && <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "5px" }}>* Your AI will automatically categorize this description.</p>}
              </div>

              {activeTab === "goal" && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: "500" }}>
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1",
                      fontSize: "16px", boxSizing: "border-box", outline: "none", background: "white", color: "#1e293b", 
                      colorScheme: "light"
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "10px",
                  padding: "15px",
                  background: loading ? "#94a3b8" : "linear-gradient(135deg, #1e3a8a, #fbbf24)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Processing..." : `Record ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionsPage;
