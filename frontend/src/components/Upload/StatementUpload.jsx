import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { classifyExpense } from "../../utils/ml/ml_predictor";
import { toast } from "../../utils/toast";

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

function StatementUpload({ onSaveComplete, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const parseFile = (file) => {
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (fileExtension !== "csv" && fileExtension !== "xlsx" && fileExtension !== "xls") {
      toast.error("Unsupported file format. Please upload a CSV or Excel file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Read headers first to recognize columns
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawRows.length < 2) {
          toast.error("The uploaded file does not contain enough data rows.");
          return;
        }

        let headerRowIndex = 0;
        let headers = [];

        // Search first 6 rows for row containing descriptions and amounts
        for (let i = 0; i < Math.min(6, rawRows.length); i++) {
          const row = rawRows[i];
          if (!row) continue;
          const hasDesc = row.some(cell => typeof cell === "string" && /desc|particular|merchant|detail|payee|narrative/i.test(cell));
          const hasAmount = row.some(cell => typeof cell === "string" && /amount|value|debit|credit/i.test(cell));
          if (hasDesc && hasAmount) {
            headerRowIndex = i;
            headers = row.map(h => String(h || "").toLowerCase().trim());
            break;
          }
        }

        if (headers.length === 0) {
          // Fallback to first row
          headers = rawRows[0].map(h => String(h || "").toLowerCase().trim());
        }

        const dateIdx = headers.findIndex(h => /date|time/i.test(h));
        const descIdx = headers.findIndex(h => /desc|particular|merchant|detail|payee|narrative/i.test(h));
        const amountIdx = headers.findIndex(h => /amount|value|debit|credit/i.test(h));

        if (descIdx === -1 || amountIdx === -1) {
          toast.error("Could not auto-detect Description or Amount columns. Please make sure headers exist in the file.");
          return;
        }

        const parsed = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawDate = dateIdx !== -1 ? row[dateIdx] : null;
          const rawDesc = row[descIdx];
          const rawAmount = row[amountIdx];

          if (!rawDesc || rawAmount === undefined || rawAmount === null || isNaN(parseFloat(rawAmount))) {
            continue;
          }

          let transactionDate = new Date();
          if (rawDate) {
            if (typeof rawDate === "number") {
              // Handle Excel serial date format
              const utcDays = Math.floor(rawDate - 25569);
              const utcValue = utcDays * 86400;
              transactionDate = new Date(utcValue * 1000);
            } else {
              const checkDate = new Date(rawDate);
              if (!isNaN(checkDate.getTime())) {
                transactionDate = checkDate;
              }
            }
          }

          const description = String(rawDesc).trim();
          const amount = Math.abs(parseFloat(rawAmount));
          const category = classifyExpense(description);

          parsed.push({
            expense_date: transactionDate.toISOString().split("T")[0],
            description,
            amount,
            category
          });
        }

        if (parsed.length === 0) {
          toast.error("No valid transactions found in statement.");
        } else {
          setTransactions(parsed);
          toast.success(`Successfully parsed ${parsed.length} transactions!`);
        }
      } catch (err) {
        console.error("Statement parsing error:", err);
        toast.error("Failed to parse statement file. Please check format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleValueChange = (index, field, value) => {
    const updated = [...transactions];
    if (field === "amount") {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setTransactions(updated);
  };

  const handleDeleteRow = (index) => {
    const updated = transactions.filter((_, i) => i !== index);
    setTransactions(updated);
  };

  const handleSave = async () => {
    if (transactions.length === 0) return;
    setIsSaving(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(transactions),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Statements uploaded and saved successfully!");
        if (onSaveComplete) {
          onSaveComplete();
        }
      } else {
        const text = await res.text();
        throw new Error(text || "Failed to save statement batch");
      }
    } catch (err) {
      console.error("Batch save error:", err);
      toast.error(err.message || "Failed to save parsed statement to backend.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "white", padding: "30px", borderRadius: "24px",
        width: "95%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid #e2e8f0"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: "700" }}>Upload Statement</h3>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>Import your bank or credit card statement (CSV, XLSX, XLS).</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer",
              fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            &times;
          </button>
        </div>

        {/* Drag and Drop Box */}
        {transactions.length === 0 && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{
              flex: 1, border: `2px dashed ${dragActive ? "#fbbf24" : "#cbd5e1"}`,
              borderRadius: "16px", background: dragActive ? "#fffdf5" : "#f8fafc",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "50px 30px", cursor: "pointer", textAlign: "center",
              transition: "all 0.2s ease-in-out"
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              style={{ display: "none" }}
            />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <p style={{ margin: "0 0 8px", fontSize: "16px", color: "#334155", fontWeight: "600" }}>
              Drag and drop your file here, or <span style={{ color: "#1e3a8a", textDecoration: "underline" }}>browse</span>
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
              Supports standard bank statement formats (.csv, .xlsx)
            </p>
          </div>
        )}

        {/* Parsed Transactions Table */}
        {transactions.length > 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#1e293b", textAlign: "left", fontSize: "14px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8fafc", borderBottom: "2px solid #e2e8f0", zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Date</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Description</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Amount (₹)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Category (Edge AI)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569", width: "60px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          type="date"
                          value={tx.expense_date}
                          onChange={(e) => handleValueChange(idx, "expense_date", e.target.value)}
                          style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "13px" }}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          type="text"
                          value={tx.description}
                          onChange={(e) => handleValueChange(idx, "description", e.target.value)}
                          style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", width: "90%", fontSize: "13px" }}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          type="number"
                          value={tx.amount}
                          onChange={(e) => handleValueChange(idx, "amount", e.target.value)}
                          style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", width: "90px", fontSize: "13px" }}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <select
                          value={tx.category}
                          onChange={(e) => handleValueChange(idx, "category", e.target.value)}
                          style={{
                            border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px",
                            background: "white", fontSize: "13px", fontWeight: "500", cursor: "pointer"
                          }}
                        >
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "8px 16px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          style={{
                            background: "transparent", border: "none", color: "#ef4444",
                            cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center"
                          }}
                          title="Remove Transaction"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#64748b" }}>
                Total: <strong>{transactions.length}</strong> transactions to import.
              </span>
              <button
                onClick={() => setTransactions([])}
                style={{
                  background: "transparent", color: "#64748b", border: "none",
                  cursor: "pointer", fontWeight: "600", textDecoration: "underline"
                }}
              >
                Clear all & upload another file
              </button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "20px", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px", background: "transparent", color: "#64748b",
              border: "none", cursor: "pointer", fontWeight: "600", fontSize: "15px"
            }}
          >
            Cancel
          </button>
          {transactions.length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: "12px 28px", background: "#1e3a8a", color: "white",
                border: "none", borderRadius: "12px", cursor: isSaving ? "not-allowed" : "pointer",
                fontWeight: "600", fontSize: "15px", boxShadow: "0 4px 12px rgba(30, 58, 138, 0.15)",
                display: "flex", alignItems: "center", gap: "8px"
              }}
            >
              {isSaving ? "Saving..." : "Save Transactions"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatementUpload;
