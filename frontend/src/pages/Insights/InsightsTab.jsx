import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Plotly from "plotly.js-basic-dist";
import logo from "../../assets/logo/logo.png";
import { toast } from "../../utils/toast";
import { generateInsights, detectSubscriptions } from "../../utils/ml/insights_engine";
import StatementUpload from "../../components/Upload/StatementUpload";
import MLGraph from "../../components/MLGraph";
import "../Dashboard/dashboard.css";

function PDFPlot({ data, layout, style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      Plotly.react(el, data, layout, { responsive: false, staticPlot: true });
    } catch (err) {
      console.error("Plotly PDF render error:", err);
    }
  }, [data, layout]);

  return <div ref={containerRef} style={style} />;
}


const CATEGORY_COLORS = {
  food_and_drink: "#f59e0b", // Amber/Gold
  rent: "#3b82f6",           // Blue
  utilities: "#06b6d4",       // Cyan
  entertainment: "#8b5cf6",   // Purple
  travel: "#ec4899",          // Pink
  health_and_fitness: "#10b981", // Emerald Green
  shopping: "#f43f5e",        // Rose
  other: "#64748b"            // Slate
};

const CATEGORY_LABELS = {
  food_and_drink: "Food & Drink",
  rent: "Rent",
  utilities: "Utilities",
  entertainment: "Entertainment",
  travel: "Travel",
  health_and_fitness: "Health & Fitness",
  shopping: "Shopping",
  other: "Other"
};

function InsightsTab() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState(() => {
    try {
      const cached = localStorage.getItem("zenora_activity_cache");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem("zenora_activity_cache");
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessModal, setEmailSuccessModal] = useState({ isOpen: false, mask: "", title: "", message: "" });
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem("zenora_profile_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const profileDropdownRef = useRef(null);
  const reportMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target)) {
        setShowReportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

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

  const fetchData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/activity?t=${Date.now()}`, {
        credentials: "include"
      });
      if (res.ok) {
        const json = await res.json();
        localStorage.setItem("zenora_activity_cache", JSON.stringify(json || []));
        setActivities(json || []);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to fetch activity data for insights:", err);
      if (!localStorage.getItem("zenora_activity_cache")) {
        toast.error("Failed to load transactions for analysis.");
      }
    } finally {
      setLoading(false);
    }
  };

  const [dashboardData, setDashboardData] = useState(() => {
    try {
      const cached = localStorage.getItem("zenora_dashboard_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard?t=${Date.now()}`, {
        credentials: "include"
      });
      if (res.ok) {
        const json = await res.json();
        localStorage.setItem("zenora_dashboard_cache", JSON.stringify(json));
        setDashboardData(json);
      }
    } catch (e) {
      console.error("Dashboard fetch error in insights:", e);
    }
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("zenora_logged_in") === "true";
    if (!isLoggedIn) {
      navigate("/");
      return;
    }
    fetchData();
    fetchProfile();
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Convert activities to uniform expense structure
  const expenses = activities
    .filter(act => act.type === "expense")
    .map(act => ({
      id: act.id,
      amount: act.amount,
      category: act.category || "other",
      description: act.description,
      expense_date: act.date ? act.date.split(" ")[0] : new Date().toISOString().split("T")[0]
    }));

  // Analyze via local insights engine
  const insights = generateInsights(expenses);
  const subscriptions = detectSubscriptions(expenses);

  // Prep chart data
  const barChartData = Object.entries(insights.monthly.comparison || {}).map(([key, data]) => ({
    name: CATEGORY_LABELS[key] || key,
    "Current Month": data.current,
    "Previous Month": data.previous
  }));

  const pieChartData = Object.entries(insights.monthly.categoryBreakdown || {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value: value,
      color: CATEGORY_COLORS[key] || "#cbd5e1"
    }));

  const calculateRegressionData = () => {
    const expenses = activities.filter(act => act.type === "expense");
    if (expenses.length === 0) return null;

    const monthlyMap = {};
    expenses.forEach(exp => {
      const dateStr = exp.date;
      if (!dateStr) return;
      const monthKey = dateStr.substring(0, 7);
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + exp.amount;
    });

    const months = Object.keys(monthlyMap).sort();
    if (months.length === 0) return null;

    const historyActual = months.map(m => monthlyMap[m]);
    const historyDates = months.map(m => `${m}-01`);

    const N = months.length;
    const X = Array.from({ length: N }, (_, i) => i);
    const Y = historyActual;

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

    const futureDates = [];
    const futurePredicted = [];
    const lastDateVal = new Date(historyDates[historyDates.length - 1]);

    for (let k = 1; k <= 3; k++) {
      const nextDate = new Date(lastDateVal.getFullYear(), lastDateVal.getMonth() + k, 1);
      const dateString = nextDate.toISOString().split("T")[0];
      futureDates.push(dateString);

      const futureIdx = N + k - 1;
      const predVal = m * futureIdx + c;
      futurePredicted.push(predVal);
    }

    if (futurePredicted.length > 0 && lrLine.length > 0) {
      const offset = lrLine[lrLine.length - 1] - futurePredicted[0];
      for (let i = 0; i < futurePredicted.length; i++) {
        futurePredicted[i] += offset;
      }
    }

    const lastDate = futureDates.length > 0 ? futureDates[futureDates.length - 1] : historyDates[historyDates.length - 1];
    const lastExpense = futurePredicted.length > 0 ? futurePredicted[futurePredicted.length - 1] : historyActual[historyActual.length - 1];

    return {
      history_dates: historyDates,
      history_actual: historyActual,
      lr_line: lrLine,
      future_dates: futureDates,
      future_predicted: futurePredicted,
      last_date: lastDate,
      last_expense: lastExpense,
      slope: m
    };
  };

  const regressionData = calculateRegressionData();

  const handleExportPDF = async (actionType) => {
    if (expenses.length === 0) {
      toast.error("No transactions to generate report.");
      return;
    }

    setSendingEmail(true);
    try {
      const username = profile?.user_name || "user";
      const last4 = username.slice(-4).toLowerCase();
      const mm = String(new Date().getMonth() + 1).padStart(2, "0");
      const password = last4 + mm;

      // Allow DOM elements in the hidden template to render completely
      await new Promise((resolve) => setTimeout(resolve, 800));

      const page1 = document.getElementById("zenora-pdf-page-1");
      const page2 = document.getElementById("zenora-pdf-page-2");

      if (!page1 || !page2) {
        throw new Error("PDF templates not found in document.");
      }

      const canvas1 = await html2canvas(page1, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc"
      });

      const canvas2 = await html2canvas(page2, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc"
      });

      // Initialize jsPDF with password protection
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        encryption: {
          userPassword: password,
          ownerPassword: password + "_owner",
          userPermissions: ["print", "copy"]
        }
      });

      // Page 1
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData1, "JPEG", 0, 0, 210, 297);
      // Interactive links on Page 1 (Privacy Policy and Terms of Use text boundaries in A4 width/height)
      doc.link(156, 272, 22, 6, { url: "http://zenoraapp.in/privacy.html" });
      doc.link(180, 272, 18, 6, { url: "https://www.zenoraapp.in/terms.html" });

      // Page 2
      doc.addPage();
      const imgData2 = canvas2.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData2, "JPEG", 0, 0, 210, 297);
      // Interactive links on Page 2
      doc.link(156, 272, 22, 6, { url: "http://zenoraapp.in/privacy.html" });
      doc.link(180, 272, 18, 6, { url: "https://www.zenoraapp.in/terms.html" });

      if (actionType === "download") {
        doc.save(`Zenora-Insights-${mm}.pdf`);
        setEmailSuccessModal({
          isOpen: true,
          mask: `****${mm}`,
          title: "Report Downloaded Successfully",
          message: "Your password-protected monthly insights report has been generated and downloaded directly to your local machine."
        });
      } else if (actionType === "email") {
        const pdfDataUri = doc.output("datauristring");
        const pdfBase64 = pdfDataUri.split(",")[1];

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/insights/email-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ pdf_base64: pdfBase64 }),
          credentials: "include"
        });

        if (res.ok) {
          setEmailSuccessModal({
            isOpen: true,
            mask: `****${mm}`,
            title: "Report Emailed Successfully",
            message: "Your password-protected monthly insights report has been delivered directly to your registered email address."
          });
        } else {
          throw new Error("Failed to send email report.");
        }
      }
    } catch (err) {
      console.error("PDF action execution failed:", err);
      toast.error(actionType === "email" ? "Failed to email insights statement." : "Failed to download insights statement.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          <h2 className="logo" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={logo} alt="Zenora Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
            Zenora
          </h2>
          <ul className="menu">
            <li onClick={() => navigate("/dashboard")}>Dashboard</li>
            <li onClick={() => navigate("/transactions")}>Transactions</li>
            <li onClick={() => navigate("/investments")}>Investments</li>
            <li onClick={() => navigate("/activity")}>Activity</li>
            <li className="active">Insights</li>
          </ul>
        </div>

        <div className="sidebar-bottom">
          <ul className="menu">
            <li className="sidebar-action" onClick={() => setSettingsModal(true)} style={{ cursor: "pointer" }}>Settings</li>
            <li className="sidebar-action" onClick={handleLogout} style={{ cursor: "pointer" }}>Logout</li>
          </ul>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Financial Intelligence</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                padding: "10px 20px", background: "#ffffff", color: "#334155",
                border: "1px solid #cbd5e1", borderRadius: "10px", cursor: "pointer", fontWeight: "600",
                fontSize: "14px", display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "#1e3a8a"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import Statement
            </button>
            <div ref={reportMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowReportMenu(!showReportMenu)}
                disabled={sendingEmail}
                style={{
                  padding: "10px 20px", background: "#1e3a8a", color: "white",
                  border: "none", borderRadius: "10px", cursor: sendingEmail ? "not-allowed" : "pointer", fontWeight: "600",
                  fontSize: "14px", display: "flex", alignItems: "center", gap: "8px",
                  boxShadow: "0 4px 10px rgba(30, 58, 138, 0.15)", transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = "0.95"}
                onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {sendingEmail ? "Processing..." : "Download Report"}
              </button>

              {showReportMenu && (
                <div style={{
                  position: "absolute",
                  top: "45px",
                  right: 0,
                  width: "185px",
                  background: "white",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
                  border: "1px solid #e2e8f0",
                  zIndex: 1000,
                  overflow: "hidden"
                }}>
                  <div 
                    onClick={() => {
                      setShowReportMenu(false);
                      handleExportPDF("download");
                    }}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#334155",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "background 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </div>
                  <div 
                    onClick={() => {
                      setShowReportMenu(false);
                      handleExportPDF("email");
                    }}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#334155",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderTop: "1px solid #f1f5f9",
                      transition: "background 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Send to Email
                  </div>
                </div>
              )}
            </div>

            {/* AvatarDropdown */}
            <div ref={profileDropdownRef} style={{ position: "relative" }}>
              <div
                className="avatar-circle"
                onClick={() => setProfileDropdown(!profileDropdown)}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: "#0ea5e9", color: "white", display: "flex",
                  alignItems: "center", justifyContent: "center", fontWeight: "700",
                  fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 10px rgba(14, 165, 233, 0.2)"
                }}
              >
                {getInitials(profile?.user_name || profile?.email || "User")}
              </div>
              {profileDropdown && (
                <div style={{
                  position: "absolute", top: "50px", right: 0, width: "240px",
                  background: "white", borderRadius: "12px", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                  border: "1px solid #e2e8f0", zIndex: 1000, overflow: "hidden"
                }}>
                  <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
                    <p style={{ margin: 0, fontWeight: "700", color: "#0f172a" }}>{profile?.user_name || "Zenora Account"}</p>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{profile?.email}</span>
                  </div>
                  <div style={{ padding: "4px 0" }}>
                    <div
                      onClick={() => { setProfileDropdown(false); setSettingsModal(true); }}
                      style={{ padding: "10px 16px", cursor: "pointer", fontSize: "13px", color: "#475569" }}
                    >
                      Settings
                    </div>
                    <div
                      onClick={handleLogout}
                      style={{ padding: "10px 16px", cursor: "pointer", fontSize: "13px", color: "#ef4444" }}
                    >
                      Logout
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="dashboard-body" style={{ flexDirection: "column", gap: "25px", marginTop: "20px" }}>
          {loading ? (
            // Premium Skeletons
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
                <div className="card skeleton-card" style={{ height: "120px" }}></div>
                <div className="card skeleton-card" style={{ height: "120px" }}></div>
                <div className="card skeleton-card" style={{ height: "120px" }}></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                <div className="card skeleton-card" style={{ height: "300px" }}></div>
                <div className="card skeleton-card" style={{ height: "300px" }}></div>
              </div>
            </div>
          ) : (
            <>
              {/* Highlights cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", width: "100%" }}>
                <div className="card" style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: "600" }}>CURRENT MONTH BURN</p>
                  <h2 style={{ margin: "10px 0 5px", color: "#0f172a" }}>₹{insights.monthly.currentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: insights.monthly.deltaPercentage <= 0 ? "#22c55e" : "#ef4444"
                  }}>
                    {insights.monthly.deltaPercentage <= 0 ? "↓ " : "↑ "}
                    {Math.abs(insights.monthly.deltaPercentage).toFixed(1)}% compared to last month
                  </span>
                </div>

                <div className="card" style={{ padding: "20px" }}>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: "600" }}>WEEKLY SPENDING</p>
                  <h2 style={{ margin: "10px 0 5px", color: "#0f172a" }}>₹{insights.weekly.currentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: insights.weekly.deltaPercentage <= 0 ? "#22c55e" : "#ef4444"
                  }}>
                    {insights.weekly.deltaPercentage <= 0 ? "↓ " : "↑ "}
                    {Math.abs(insights.weekly.deltaPercentage).toFixed(1)}% compared to last week
                  </span>
                </div>

                <div className="card" style={{ padding: "20px", borderLeft: "4px solid #fbbf24" }}>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: "600" }}>PROJECTED MONTH-END</p>
                  <h2 style={{ margin: "10px 0 5px", color: "#fbbf24" }}>₹{insights.projectedEndMonth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Daily Burn: ₹{insights.dailyBurnRate.toFixed(0)}/day
                  </p>
                </div>
              </div>

              {/* Charts Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", width: "100%" }}>
                {/* Category Comparison */}
                <div className="card" style={{ padding: "25px", height: "350px", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ margin: "0 0 15px", color: "#0f172a", fontSize: "16px", fontWeight: "700" }}>Category Breakdown: Month-over-Month</h4>
                  <div style={{ flex: 1, width: "100%", height: "100%" }}>
                    {expenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height="95%">
                        <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "rgba(15, 23, 42, 0.95)", border: "none", borderRadius: "12px", color: "white" }}
                            labelStyle={{ fontWeight: "700", marginBottom: "4px", color: "white" }}
                            itemStyle={{ color: "#e2e8f0" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                          <Bar dataKey="Current Month" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Previous Month" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                        Add expenses to generate charts.
                      </div>
                    )}
                  </div>
                </div>

                {/* Expense Allocation */}
                <div className="card" style={{ padding: "25px", height: "350px", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ margin: "0 0 15px", color: "#0f172a", fontSize: "16px", fontWeight: "700" }}>Current Month Allocation</h4>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pieChartData.length > 0 ? (
                      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
                        <div style={{ width: "60%", height: "100%" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ background: "rgba(15, 23, 42, 0.9)", border: "none", borderRadius: "12px", color: "white" }}
                                formatter={(value) => [`₹${Number(value).toFixed(0)}`, "Spend"]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ width: "40%", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "250px" }}>
                          {pieChartData.map((entry, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: entry.color }}></div>
                              <span style={{ fontWeight: "600", color: "#475569" }}>{entry.name}:</span>
                              <span style={{ color: "#0f172a", fontWeight: "700" }}>₹{entry.value.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "#94a3b8" }}>No data points available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscriptions & Actionable Recommendations */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", width: "100%" }}>
                {/* Recurring subscriptions */}
                <div className="card" style={{ padding: "25px", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ margin: "0 0 15px", color: "#0f172a", fontSize: "16px", fontWeight: "700" }}>Auto-Detected Recurring Subscriptions</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {subscriptions.length > 0 ? (
                      subscriptions.map((sub, idx) => (
                        <div key={idx} style={{
                          padding: "16px", background: "#f8fafc", borderRadius: "14px",
                          border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: "700", color: "#1e293b", fontSize: "14px", textTransform: "capitalize" }}>{sub.name}</p>
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>
                              Last: {sub.lastPaymentDate} | Next: {sub.nextPaymentDate}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontWeight: "800", color: "#1e3a8a", fontSize: "15px" }}>₹{sub.amount.toFixed(0)}</p>
                            <span style={{
                              fontSize: "10px", fontWeight: "700", padding: "2px 6px",
                              borderRadius: "8px", background: sub.type === "weekly" ? "#e0f2fe" : "#fef3c7",
                              color: sub.type === "weekly" ? "#0369a1" : "#b45309", textTransform: "uppercase"
                            }}>
                              {sub.type}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "#94a3b8", margin: 0, fontSize: "13px" }}>No repeating transaction patterns detected yet. Subscriptions are automatically located over time.</p>
                    )}
                  </div>
                </div>

                {/* Savings Recommendations */}
                <div className="card" style={{ padding: "25px", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ margin: "0 0 15px", color: "#0f172a", fontSize: "16px", fontWeight: "700" }}>Actionable Savings Advice</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {insights.recommendations.map((rec, idx) => (
                      <div key={idx} style={{
                        padding: "16px", background: "#fffdf5", borderRadius: "14px",
                        border: "1px solid #fef3c7", position: "relative"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                          <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#854d0e" }}>{rec.title}</h5>
                          {rec.savings > 0 && (
                            <span style={{
                              fontSize: "11px", fontWeight: "800", background: "#fef08a",
                              color: "#854d0e", padding: "3px 8px", borderRadius: "12px"
                            }}>
                              Save ₹{rec.savings.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "12.5px", color: "#71717a", lineHeight: "1.5" }}>{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* On-Device ML Predictor Graph */}
              <div style={{ width: "100%" }}>
                <MLGraph />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Settings Modal */}
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

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setSettingsModal(false)}
                style={{ padding: "12px 20px", background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "15px" }}
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                style={{ padding: "12px 20px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "15px" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement Upload Modal */}
      {showUploadModal && (
        <StatementUpload
          onClose={() => setShowUploadModal(false)}
          onSaveComplete={() => {
            setShowUploadModal(false);
            fetchData();
          }}
        />
      )}

      {/* Report Action Success Modal */}
      {emailSuccessModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "white", padding: "30px", borderRadius: "20px",
            width: "90%", maxWidth: "450px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0", textAlign: "center", fontFamily: "'Inter', sans-serif"
          }}>
            <h3 style={{ margin: "0 0 10px", color: "#1e3a8a", fontSize: "20px", fontWeight: "700" }}>{emailSuccessModal.title}</h3>
            <p style={{ margin: "0 0 20px", color: "#475569", fontSize: "14.5px", lineHeight: "1.6" }}>
              {emailSuccessModal.message}
            </p>
            <div style={{
              background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", 
              border: "1px solid #e2e8f0", marginBottom: "20px", fontSize: "14px", 
              fontWeight: "600", color: "#1e3a8a"
            }}>
              Decryption Password Key: <code style={{ fontSize: "15px", letterSpacing: "1px" }}>{emailSuccessModal.mask}</code>
            </div>
            <p style={{ margin: "0 0 25px", color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
              The file is protected with your secure personal key, constructed from the last 4 characters of your username and the current month.
            </p>
            <button
              onClick={() => setEmailSuccessModal({ isOpen: false, mask: "", title: "", message: "" })}
              style={{
                width: "100%", padding: "12px", background: "#1e3a8a", color: "white",
                border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600",
                fontSize: "15px", boxShadow: "0 4px 12px rgba(30, 58, 138, 0.15)"
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>

    {/* Off-screen PDF Template */}
    <div id="zenora-pdf-template" style={{
      position: "fixed",
      left: "-9999px",
      top: "-9999px",
      width: "800px",
      background: "#f8fafc",
      color: "#0f172a",
      boxSizing: "border-box",
      zIndex: -9999,
      pointerEvents: "none"
    }}>
        {/* PAGE 1 */}
        <div id="zenora-pdf-page-1" style={{
          width: "800px",
          height: "1130px",
          padding: "40px",
          boxSizing: "border-box",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "1px solid #cbd5e1"
        }}>
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "25px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src={logo} alt="Logo" style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: "26px", color: "#1e3a8a", fontWeight: "800", letterSpacing: "-0.5px" }}>Zenora</h1>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", letterSpacing: "1px" }}>FINANCIAL INTELLIGENCE REPORT</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>{profile?.user_name || "Zenora Account"}</p>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{profile?.email}</span>
                <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#94a3b8" }}>Report Month: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
            </div>

            {/* Overview Section */}
            <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>1. Account & Portfolio Overview</h3>
            
            {/* Row 1: Dashboard Balance Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "25px" }}>
              <div style={{ background: "white", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(0,0,0,0.03)" }}>
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "500" }}>Current Balance</span>
                <h3 style={{ margin: "8px 0 0 0", color: "#0f172a", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>₹{dashboardData?.current_balance?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</h3>
              </div>
              <div style={{ background: "white", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(0,0,0,0.03)" }}>
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "500" }}>Net Worth</span>
                <h3 style={{ margin: "8px 0 0 0", color: "#22c55e", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>₹{dashboardData?.total_net_worth?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</h3>
              </div>
              <div style={{ background: "white", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(0,0,0,0.03)" }}>
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "500" }}>Total Investments</span>
                <h3 style={{ margin: "8px 0 0 0", color: "#3b82f6", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>₹{dashboardData?.total_investments?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</h3>
              </div>
              <div style={{ 
                background: "#1e3a8a", 
                padding: "18px", 
                borderRadius: "16px", 
                color: "white", 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "center", 
                alignItems: "center", 
                textAlign: "center",
                border: "none",
                boxShadow: "0 10px 20px rgba(30, 58, 138, 0.15)"
              }}>
                <span style={{ color: "#ffffff", opacity: 0.9, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>AI SPENDING BEHAVIOR</span>
                <h4 style={{ margin: "8px 0 0 0", color: "#fbbf24", fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" }}>{dashboardData?.ml_spender_type || "Balanced"}</h4>
              </div>
            </div>

            {/* Row 2: Burn Analytics Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "30px" }}>
              <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Current Month Burn</span>
                <h3 style={{ margin: "6px 0 0 0", color: "#0f172a", fontSize: "18px", fontWeight: "700" }}>₹{insights.monthly.currentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                <span style={{ fontSize: "10px", fontWeight: "700", color: insights.monthly.deltaPercentage <= 0 ? "#22c55e" : "#ef4444" }}>
                  {insights.monthly.deltaPercentage <= 0 ? "↓ " : "↑ "}{Math.abs(insights.monthly.deltaPercentage).toFixed(1)}% vs last month
                </span>
              </div>
              <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Weekly Spending</span>
                <h3 style={{ margin: "6px 0 0 0", color: "#0f172a", fontSize: "18px", fontWeight: "700" }}>₹{insights.weekly.currentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                <span style={{ fontSize: "10px", fontWeight: "700", color: insights.weekly.deltaPercentage <= 0 ? "#22c55e" : "#ef4444" }}>
                  {insights.weekly.deltaPercentage <= 0 ? "↓ " : "↑ "}{Math.abs(insights.weekly.deltaPercentage).toFixed(1)}% vs last week
                </span>
              </div>
              <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #fbbf24", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Projected Month-End</span>
                <h3 style={{ margin: "6px 0 0 0", color: "#fbbf24", fontSize: "18px", fontWeight: "700" }}>₹{insights.projectedEndMonth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                <span style={{ fontSize: "10px", color: "#64748b" }}>Burn Rate: ₹{insights.dailyBurnRate.toFixed(0)}/day</span>
              </div>
            </div>

            {/* Charts Section */}
            <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>2. Visual Expense Analytics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", height: "270px", boxSizing: "border-box" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>Category comparison: MoM</h4>
                {barChartData.length > 0 && (
                  <BarChart width={400} height={190} data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Legend wrapperStyle={{ fontSize: 9, paddingTop: 5 }} />
                    <Bar dataKey="Current Month" fill="#fbbf24" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Previous Month" fill="#1e3a8a" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                )}
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", height: "270px", boxSizing: "border-box" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>Current Month Allocation</h4>
                {pieChartData.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <PieChart width={140} height={140}>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div style={{ marginLeft: "10px", display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflow: "hidden" }}>
                      {pieChartData.slice(0, 5).map((entry, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: entry.color }}></div>
                          <span style={{ fontWeight: "600", color: "#475569" }}>{entry.name}:</span>
                          <span style={{ color: "#0f172a", fontWeight: "700" }}>₹{entry.value.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer page 1 */}
          <div style={{
            borderTop: "1px solid #e2e8f0",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            fontSize: "11px",
            color: "#64748b",
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ margin: 0, fontWeight: "700", color: "#475569" }}>© 2026 Zenora Fintech Private Limited</p>
              <p style={{ margin: 0 }}>Built with privacy in mind. Your data is secure and encrypted.</p>
              <p style={{ margin: 0 }}>Zenora provides insights, not financial advice.</p>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", color: "#64748b" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </div>
            </div>
            <div style={{ display: "flex", gap: "20px" }}>
              <span style={{ color: "#475569", fontWeight: "600", fontSize: "12px" }}>Privacy Policy</span>
              <span style={{ color: "#475569", fontWeight: "600", fontSize: "12px" }}>Terms of Use</span>
            </div>
          </div>
        </div>

        {/* PAGE 2 */}
        <div id="zenora-pdf-page-2" style={{
          width: "800px",
          height: "1130px",
          padding: "40px",
          boxSizing: "border-box",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "1px solid #cbd5e1"
        }}>
          <div>
            {/* Header Page 2 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "15px", marginBottom: "25px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src={logo} alt="Logo" style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: "26px", color: "#1e3a8a", fontWeight: "800", letterSpacing: "-0.5px" }}>Zenora</h1>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", letterSpacing: "1px" }}>FINANCIAL INTELLIGENCE REPORT</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>{profile?.user_name || "Zenora Account"}</p>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{profile?.email}</span>
                <p style={{ margin: "4px 0 0 0", fontSize: "10px", color: "#94a3b8" }}>Page 2</p>
              </div>
            </div>

            {/* Recurring subscriptions & advice */}
            <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>3. Subscriptions & Actionable Savings Advice</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
              {/* Subscriptions Card */}
              <div style={{ background: "white", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", minHeight: "260px", boxSizing: "border-box" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>Recurring Charges</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {subscriptions.length > 0 ? (
                    subscriptions.slice(0, 4).map((sub, idx) => (
                      <div key={idx} style={{ padding: "10px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: "700", color: "#1e293b", fontSize: "12px", textTransform: "capitalize" }}>{sub.name}</p>
                          <span style={{ fontSize: "9px", color: "#64748b" }}>Next: {sub.nextPaymentDate}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontWeight: "800", color: "#1e3a8a", fontSize: "13px" }}>₹{sub.amount.toFixed(0)}</p>
                          <span style={{ fontSize: "8px", fontWeight: "700", padding: "1px 4px", borderRadius: "4px", background: "#fef3c7", color: "#b45309" }}>{sub.type}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>No active subscriptions detected.</p>
                  )}
                </div>
              </div>

              {/* Actionable Advice Card */}
              <div style={{ background: "white", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", minHeight: "260px", boxSizing: "border-box" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>Savings Advice</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {insights.recommendations.slice(0, 3).map((rec, idx) => (
                    <div key={idx} style={{ padding: "10px", background: "#fffdf5", borderRadius: "10px", border: "1px solid #fef3c7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h5 style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "#854d0e" }}>{rec.title}</h5>
                        <span style={{ fontSize: "9px", fontWeight: "800", background: "#fef08a", color: "#854d0e", padding: "2px 6px", borderRadius: "8px" }}>Save ₹{rec.savings.toFixed(0)}</span>
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "10.5px", color: "#71717a", lineHeight: "1.4" }}>{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Regression Forecast Panel */}
            <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>4. On-Device Spender Horizon Projection</h3>
            
            <div style={{ background: "white", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxSizing: "border-box" }}>
              {regressionData && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", background: "#f8fafc", padding: "10px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "600" }}>TARGET MONTH</span>
                      <p style={{ margin: "2px 0 0 0", fontWeight: "700", color: "#0f172a" }}>{new Date(regressionData.last_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "600" }}>PREDICTED SPEND</span>
                      <p style={{ margin: "2px 0 0 0", fontWeight: "800", color: "#1e3a8a" }}>₹{regressionData.last_expense.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "600" }}>TREND</span>
                      <p style={{ margin: "2px 0 0 0", fontWeight: "700", color: regressionData.slope > 0 ? "#ef4444" : "#22c55e" }}>
                        {regressionData.slope > 0 ? "📈 Upward" : "📉 Downward"}
                      </p>
                    </div>
                  </div>
                  {/* Native Plotly regression plot */}
                  {regressionData && (
                    <PDFPlot
                      data={[
                        {
                          x: regressionData.history_dates,
                          y: regressionData.history_actual,
                          type: "scatter",
                          mode: "lines+markers",
                          name: "Actual Spending",
                          marker: { size: 6, color: "#fbbf24" },
                          line: { color: "#fbbf24", width: 2, dash: "dot" }
                        },
                        {
                          x: regressionData.history_dates,
                          y: regressionData.lr_line,
                          type: "scatter",
                          mode: "lines",
                          name: "Regression Fit",
                          line: { color: "#1e3a8a", width: 2 }
                        },
                        ...(regressionData.future_dates.length > 0 ? [{
                          x: regressionData.future_dates,
                          y: regressionData.future_predicted,
                          type: "scatter",
                          mode: "lines+markers",
                          name: "Future Projection",
                          marker: { size: 6, color: "#10b981" },
                          line: { color: "#10b981", width: 2 }
                        }] : [])
                      ]}
                      layout={{
                        autosize: false,
                        width: 720,
                        height: 200,
                        paper_bgcolor: "#ffffff",
                        plot_bgcolor: "#ffffff",
                        xaxis: { type: "date", tickformat: "%b %Y", gridcolor: "#f1f5f9", linecolor: "#e2e8f0", tickfont: { size: 9 } },
                        yaxis: { gridcolor: "#f1f5f9", linecolor: "#e2e8f0", tickfont: { size: 9 } },
                        legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center", font: { size: 9 } },
                        margin: { l: 40, r: 10, t: 10, b: 30 },
                        font: { family: "'Inter', sans-serif", color: "#475569" }
                      }}
                      style={{ width: "720px", height: "200px" }}
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* Disclaimer */}
            <div style={{ marginTop: "12px", fontSize: "10px", color: "#94a3b8", textAlign: "left", lineHeight: "1.4" }}>
              <strong>Disclaimer:</strong> Forecasts are mathematical estimations calculated locally on your device via linear regression of historical spending. Actual expenditures may vary due to changes in spending behavior, variable pricing, or unexpected financial transactions.
            </div>
          </div>

          {/* Footer page 2 */}
          <div style={{
            borderTop: "1px solid #e2e8f0",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            fontSize: "11px",
            color: "#64748b",
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ margin: 0, fontWeight: "700", color: "#475569" }}>© 2026 Zenora Fintech Private Limited</p>
              <p style={{ margin: 0 }}>Built with privacy in mind. Your data is secure and encrypted.</p>
              <p style={{ margin: 0 }}>Zenora provides insights, not financial advice.</p>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", color: "#64748b" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </div>
            </div>
            <div style={{ display: "flex", gap: "20px" }}>
              <span style={{ color: "#475569", fontWeight: "600", fontSize: "12px" }}>Privacy Policy</span>
              <span style={{ color: "#475569", fontWeight: "600", fontSize: "12px" }}>Terms of Use</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InsightsTab;
