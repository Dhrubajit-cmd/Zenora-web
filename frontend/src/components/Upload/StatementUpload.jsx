import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { classifyExpense } from "../../utils/ml/ml_predictor";
import { toast } from "../../utils/toast";

function parseTransactionDate(rawDate) {
  if (!rawDate) return new Date();
  
  if (typeof rawDate === "number") {
    const utcDays = Math.floor(rawDate - 25569);
    const utcValue = utcDays * 86400;
    return new Date(utcValue * 1000);
  }

  const str = String(rawDate).trim();
  if (!str) return new Date();

  // Try standard ISO parsing first
  const isoCheck = new Date(str);
  if (!isNaN(isoCheck.getTime())) {
    return isoCheck;
  }

  const parts = str.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    let day, month, year;
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const getMonthNum = (mStr) => {
      const clean = mStr.toLowerCase().substring(0, 3);
      const idx = monthNames.indexOf(clean);
      return idx !== -1 ? idx + 1 : parseInt(mStr, 10);
    };

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = getMonthNum(parts[1]);
      day = parseInt(parts[2], 10);
    } else if (parts[2].length === 4 || parts[2].length === 2) {
      day = parseInt(parts[0], 10);
      month = getMonthNum(parts[1]);
      year = parseInt(parts[2], 10);
      if (parts[2].length === 2) {
        year += year < 50 ? 2000 : 1900;
      }
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const d = new Date(year, month - 1, day, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  return new Date();
}

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
        let maxScore = 0;

        // Scan first 25 rows to find the most probable header row using a scoring model
        for (let i = 0; i < Math.min(25, rawRows.length); i++) {
          const row = rawRows[i];
          if (!row) continue;

          const hasDate = row.some(cell => /date|time|val.*dt|txn.*dt|post.*dt|booking.*dt/i.test(String(cell || "")));
          const hasDesc = row.some(cell => /desc|particular|merchant|detail|payee|narrative|remark|txn.*desc|transaction|narratives/i.test(String(cell || "")));
          const hasAmt = row.some(cell => /amount|value|spent|outflow|inflow|charge|price|payment/i.test(String(cell || "")));
          const hasDebOrCred = row.some(cell => /debit|credit|withdrawal|deposit|dr\b|cr\b/i.test(String(cell || "")));

          let score = 0;
          if (hasDate) score += 1.0;
          if (hasDesc) score += 1.5;
          if (hasAmt || hasDebOrCred) score += 1.5;

          if (score > maxScore && score >= 2.0) {
            maxScore = score;
            headerRowIndex = i;
            headers = row.map(h => String(h || "").toLowerCase().trim());
          }
        }

        // Fallback if no high-probability header row detected
        if (headers.length === 0 && rawRows.length > 0) {
          headers = rawRows[0].map(h => String(h || "").toLowerCase().trim());
        }

        const dateIdx = headers.findIndex(h => /date|time|val.*dt|txn.*dt|post.*dt|booking.*dt/i.test(h));

        const descIdx = headers.findIndex((h, idx) => {
          if (idx === dateIdx) return false;
          if (/date|time|dt\b/i.test(h)) return false;
          return /desc|particular|merchant|detail|payee|narrative|remark|txn.*desc|transaction|narratives/i.test(h);
        });

        const debitIdx = headers.findIndex((h, idx) => {
          if (idx === dateIdx || idx === descIdx) return false;
          if (/date|time|dt\b/i.test(h)) return false;
          return /debit|withdrawal|dr\b/i.test(h);
        });

        const creditIdx = headers.findIndex((h, idx) => {
          if (idx === dateIdx || idx === descIdx) return false;
          if (/date|time|dt\b/i.test(h)) return false;
          return /credit|deposit|cr\b/i.test(h);
        });

        const typeIdx = headers.findIndex((h, idx) => {
          if (idx === dateIdx || idx === descIdx || idx === debitIdx || idx === creditIdx) return false;
          if (/date|time|dt\b/i.test(h)) return false;
          return /type|mode|dr.*cr/i.test(h);
        });

        const amountIdx = headers.findIndex((h, idx) => {
          if (idx === dateIdx || idx === descIdx || idx === debitIdx || idx === creditIdx || idx === typeIdx) return false;
          if (/date|time|dt\b/i.test(h)) return false;
          return /amount|value|spent|outflow|inflow|charge|price|payment/i.test(h);
        });

        if (descIdx === -1 || (amountIdx === -1 && debitIdx === -1 && creditIdx === -1)) {
          toast.error("Could not auto-detect Description or Amount columns. Please make sure headers exist in the file.");
          return;
        }

        const parsed = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawDate = dateIdx !== -1 ? row[dateIdx] : null;
          const rawDesc = descIdx !== -1 ? row[descIdx] : null;

          let transactionType = "expense"; // default
          let rawAmount = null;

          if (amountIdx !== -1) {
            const valStr = String(row[amountIdx] || "");
            const isNegative = valStr.includes("-");
            const val = parseFloat(valStr.replace(/[^0-9.-]/g, ""));
            rawAmount = val;

            if (typeIdx !== -1) {
              const typeStr = String(row[typeIdx] || "").toLowerCase();
              if (typeStr.includes("cr") || typeStr.includes("credit") || typeStr.includes("dep") || typeStr.includes("in")) {
                transactionType = "income";
              } else if (typeStr.includes("dr") || typeStr.includes("debit") || typeStr.includes("wdr") || typeStr.includes("out")) {
                transactionType = "expense";
              }
            } else if (isNegative || val < 0) {
              transactionType = "expense";
              rawAmount = Math.abs(val);
            }
          } else {
            const debStr = debitIdx !== -1 ? String(row[debitIdx] || "").replace(/[^0-9.-]/g, "") : "";
            const credStr = creditIdx !== -1 ? String(row[creditIdx] || "").replace(/[^0-9.-]/g, "") : "";
            const debVal = parseFloat(debStr);
            const credVal = parseFloat(credStr);

            if (!isNaN(debVal) && debVal !== 0) {
              rawAmount = debVal;
              transactionType = "expense";
            } else if (!isNaN(credVal) && credVal !== 0) {
              rawAmount = credVal;
              transactionType = "income";
            }
          }

          if (!rawDesc || rawAmount === undefined || rawAmount === null || isNaN(parseFloat(rawAmount))) {
            continue;
          }

          const transactionDate = parseTransactionDate(rawDate);

          const description = String(rawDesc).trim();
          const amount = Math.abs(parseFloat(rawAmount));
          const category = classifyExpense(description);

          parsed.push({
            expense_date: transactionDate.toISOString().split("T")[0],
            description,
            amount,
            category: transactionType === "income" ? "" : category,
            type: transactionType
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
      const expensesPayload = transactions
        .filter(tx => tx.type === "expense")
        .map(tx => ({
          category: tx.category,
          description: tx.description,
          amount: tx.amount,
          expense_date: tx.expense_date
        }));

      const incomesPayload = transactions
        .filter(tx => tx.type === "income")
        .map(tx => ({
          source: tx.description,
          amount: tx.amount,
          income_date: tx.expense_date
        }));

      // 1. Save expenses if any
      if (expensesPayload.length > 0) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(expensesPayload),
          credentials: "include"
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to save expenses statement batch");
        }
      }

      // 2. Save incomes if any
      if (incomesPayload.length > 0) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/incomes/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(incomesPayload),
          credentials: "include"
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to save incomes statement batch");
        }
      }

      toast.success("Statements uploaded and saved successfully!");
      if (onSaveComplete) {
        onSaveComplete();
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
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569", width: "100px" }}>Type</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Description</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Amount (₹)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569" }}>Category (Edge AI)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569", width: "60px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: tx.type === "income" ? "#fbfdfb" : "transparent" }}>
                      <td style={{ padding: "8px 16px" }}>
                        <input
                          type="date"
                          value={tx.expense_date}
                          onChange={(e) => handleValueChange(idx, "expense_date", e.target.value)}
                          style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 10px", fontSize: "13px" }}
                        />
                      </td>
                      <td style={{ padding: "8px 16px" }}>
                        <select
                          value={tx.type}
                          onChange={(e) => handleValueChange(idx, "type", e.target.value)}
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            background: tx.type === "income" ? "#f0fdf4" : "#fef2f2",
                            color: tx.type === "income" ? "#15803d" : "#b91c1c",
                            fontWeight: "700",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          <option value="expense" style={{ color: "#b91c1c" }}>Expense</option>
                          <option value="income" style={{ color: "#15803d" }}>Income</option>
                        </select>
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
                        {tx.type === "income" ? (
                          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600", paddingLeft: "10px" }}>Income (N/A)</span>
                        ) : (
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
                        )}
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
