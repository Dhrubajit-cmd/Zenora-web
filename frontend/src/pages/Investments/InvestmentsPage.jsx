import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Dashboard/dashboard.css"; 

function InvestmentsPage() {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvestments = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/investments/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setInvestments(json || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvestments();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-top">
          <h2 className="logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>FinTrack</h2>
          <ul className="menu">
            <li onClick={() => navigate("/dashboard")}>Dashboard</li>
            <li onClick={() => navigate("/transactions")}>Transactions</li>
            <li className="active">Investments</li>
            <li onClick={() => navigate("/activity")}>Activity</li>
          </ul>
        </div>
        
        <div className="sidebar-bottom">
          <ul className="menu">
            <li className="sidebar-action">Settings</li>
            <li className="sidebar-action" onClick={handleLogout}>Logout</li>
          </ul>
        </div>
      </div>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        <div className="header">
          <h2 style={{ color: "white", margin: 0 }}>My Investments</h2>
          <div className="profile">👤 User</div>
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
