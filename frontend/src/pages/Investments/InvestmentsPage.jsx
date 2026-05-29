import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo/logo.png";
import { toast } from "../../utils/toast";
import "../Dashboard/dashboard.css"; 

function InvestmentsPage() {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        credentials: "include"
      });
      if (res.ok) {
        const json = await res.json();
        localStorage.setItem("zenora_profile_cache", JSON.stringify(json));
        localStorage.setItem("zenora_logged_in", "true");
        setProfile(json);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
  };

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/investments/all`, {
          credentials: "include",
        });

        if (res.ok) {
          const json = await res.json();
          setInvestments(json || []);
        } else if (res.status === 401) {
          handleLogout();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const isLoggedIn = localStorage.getItem("zenora_logged_in") === "true";
    if (!isLoggedIn) {
      navigate("/");
      return;
    }
    fetchInvestments();
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    localStorage.removeItem("zenora_logged_in");
    localStorage.removeItem("zenora_dashboard_cache");
    localStorage.removeItem("zenora_activity_cache");
    localStorage.removeItem("zenora_profile_cache");
    navigate("/");
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
            <li onClick={() => navigate("/dashboard")}>Dashboard</li>
            <li onClick={() => navigate("/transactions")}>Transactions</li>
            <li className="active">Investments</li>
            <li onClick={() => navigate("/activity")}>Activity</li>
          </ul>
        </div>
        
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

      {/* REACT CUSTOM DELETE ACCOUNT CONFIRMATION MODAL */}
      {deleteAccountModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#231b1b", padding: "30px 40px", borderRadius: "24px",
            width: "90%", maxWidth: "480px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontFamily: "'Inter', sans-serif"
          }}>
            <h3 style={{ margin: "0 0 16px", color: "white", fontSize: "19px", fontWeight: "700" }}>
              app.zenoraapp.in says
            </h3>
            <p style={{ margin: "0 0 30px", color: "#e2e8f0", fontSize: "15px", lineHeight: "1.6", fontWeight: "500" }}>
              CAUTION: Are you absolutely sure you want to permanently delete your Zenora account? This action is irreversible.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px" }}>
              <button
                onClick={() => setDeleteAccountModal(false)}
                style={{
                  padding: "12px 28px",
                  background: "#6b3745",
                  color: "#ffccd5",
                  border: "none",
                  borderRadius: "30px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#7f4252"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#6b3745"}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDeleteAccountModal(false);
                  toast.error("Account deletion requested. Please contact administrative support to confirm.");
                }}
                style={{
                  padding: "12px 32px",
                  background: "#fca5a5",
                  color: "#4c0519",
                  border: "none",
                  borderRadius: "30px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fecdd3"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fca5a5"}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        <div className="header">
          <h2 style={{ margin: 0 }}>My Investments</h2>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "12px" }}>
                      <path d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H18L22 22V4C22 2.9 21.1 2 20 2Z" fill="#007aff" />
                      <rect x="5" y="6" width="9" height="2" rx="0.5" fill="white" />
                      <rect x="5" y="10" width="9" height="2" rx="0.5" fill="white" />
                      <rect x="5" y="14" width="6" height="2" rx="0.5" fill="white" />
                      <path d="M18.78 4.8C18.49 4.51 18.01 4.51 17.72 4.8L16.34 6.18L18.42 8.26L19.8 6.88C20.09 6.59 20.09 6.11 19.8 5.82L18.78 4.8ZM15.63 6.89L9.5 13.02V15.1H11.58L17.71 8.97L15.63 6.89Z" fill="white" />
                    </svg>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "12px" }}>
                      <path d="M5 3C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H13C14.1 21 15 20.1 15 19V16H13V19H5V5H13V8H15V5C15 3.9 14.1 3 13 3H5Z" fill="#ff3b30" />
                      <path d="M19 12L15 8V11H9V13H15V16L19 12Z" fill="#ff3b30" />
                    </svg>
                    Logout
                  </div>

                  <div 
                    onClick={() => { 
                      setProfileDropdown(false); 
                      setDeleteAccountModal(true);
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "12px" }}>
                      <path d="M15.5 4L14.5 3H9.5L8.5 4H5V6H19V4H15.5Z" fill="#007aff" />
                      <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM9 9H11V18H9V9ZM13 9H15V18H13V9Z" fill="#007aff" />
                    </svg>
                    Delete Account
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-body" style={{ flexDirection: "column" }}>
          
          <div className="card" style={{ width: "100%", padding: "30px", marginTop: "20px" }}>
            {loading ? (
               <p style={{ color: "#94a3b8" }}>Loading investments...</p>
            ) : investments.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#1e293b" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "12px" }}>Date</th>
                    <th style={{ padding: "12px" }}>Asset Type</th>
                    <th style={{ padding: "12px", textAlign: "right" }}>Amount Invested</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv, idx) => (
                       <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                         <td style={{ padding: "12px", color: "#94a3b8", fontSize: "14px" }}>
                            {new Date(inv.investment_date).toLocaleDateString()}
                         </td>
                         <td style={{ padding: "12px", fontWeight: "600", textTransform: "capitalize", color: "#3b82f6" }}>
                            {inv.asset_type}
                         </td>
                         <td style={{ padding: "12px", textAlign: "right", color: "#1e293b", fontWeight: "bold" }}>
                            ₹{inv.amount.toFixed(2)}
                         </td>
                       </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#94a3b8" }}>No investments found.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default InvestmentsPage;
