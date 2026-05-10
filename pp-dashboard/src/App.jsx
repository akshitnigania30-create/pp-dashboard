import { useState, useEffect, useRef, useCallback } from "react";

const API_KEY_PLACEHOLDER = "";

const SYSTEM_PROMPT = `You are an expert AI analyst for Radha Darshan Petropack LLP, a PP woven sack manufacturing company. You analyze daily operational Excel reports and extract structured manufacturing intelligence.

The daily reports contain 7 report types:
1. Weaving Plant Production Report (Shift-wise) - Contractor groups (SHIVAM/SANKAR/CHOTU), Loom No., Model (576/620/720), Running Looms, Production (Mtrs & KG), Per Hour Production, Wastage (Pipe Cut, B/C), Day/Night waste%
2. Tape Plant & Weaving Plant Summary - Tape-1/2/3 production/waste, Weaving summary, Lamination (Prod Mtr/Kg, PP/Film Waste), Finish/BCS
3. Daily Despatch Report - Party Name, Transport, Area, Weaving/Lamination/Folding/Bag quantities, Local vs Export, cumulative totals
4. Raw Material (Colour Masterbatch) Stock - Code, Item, Opening/Closing stock, Issue to Tape-1/2/3/Lami
5. Loom-wise Production & Speed Report - Loom No., GSM, Inch, AVG, Manual target, LOOM Fabric Mtr actual, PRO.M TR target, DIFF variance, Operator Name
6. Raw Material Stock Report - PP granules, RP chips, CC, Modifier, TPT, Lamination materials - Opening/Receipt/Issue/Closing
7. Man Power Costing Report - Department, headcount Day/Night, Rate/day, Amount, Production KGS, Price/KGS labour cost, Electric cost

When the user uploads a report (as image or text), extract ALL available data and return a JSON object with this EXACT structure (use null for missing fields, never omit keys):

{
  "report_date": "DD/MM/YYYY",
  "summary": {
    "total_production_kg": number,
    "tape_production_kg": number,
    "weaving_production_mtr": number,
    "weaving_production_kg": number,
    "lamination_production_kg": number,
    "running_looms_day": number,
    "running_looms_night": number,
    "weaving_waste_pct": number,
    "tape_waste_pct": number,
    "lamination_waste_pct": number,
    "total_dispatch_kg": number,
    "labour_cost_per_kg": number,
    "electric_cost_per_kg": number,
    "total_labour_cost": number,
    "total_electric_cost": number
  },
  "contractors": [
    {"name": "SHIVAM", "running_looms_day": number, "running_looms_night": number, "production_mtr": number, "production_kg": number, "waste_pct": number, "pipe_cut_kg": number},
    {"name": "SANKAR", "running_looms_day": number, "running_looms_night": number, "production_mtr": number, "production_kg": number, "waste_pct": number, "pipe_cut_kg": number},
    {"name": "CHOTU", "running_looms_day": number, "running_looms_night": number, "production_mtr": number, "production_kg": number, "waste_pct": number, "pipe_cut_kg": number}
  ],
  "tape_lines": [
    {"line": "Tape-1", "production_kg_day": number, "production_kg_night": number, "waste_kg": number, "waste_pct": number},
    {"line": "Tape-2", "production_kg_day": number, "production_kg_night": number, "waste_kg": number, "waste_pct": number},
    {"line": "Tape-3", "production_kg_day": number, "production_kg_night": number, "waste_kg": number, "waste_pct": number}
  ],
  "loom_operators": [
    {"operator": "string", "loom_nos": "string", "target_mtr": number, "actual_mtr": number, "diff": number}
  ],
  "raw_materials": [
    {"code": "string", "name": "string", "closing_stock_kg": number, "daily_consumption_kg": number, "days_remaining": number}
  ],
  "dispatch": {
    "today_kg": number,
    "cumulative_kg": number,
    "local_kg": number,
    "export_kg": number,
    "parties": [{"name": "string", "qty_kg": number, "area": "string"}]
  },
  "departments": [
    {"name": "string", "headcount": number, "cost": number, "cost_pct": number}
  ],
  "alerts": [
    {"type": "RED|AMBER|GREEN", "category": "string", "message": "string", "action": "string"}
  ],
  "kpis": {
    "oee_pct": number,
    "tape_to_weaving_ratio": number,
    "dispatch_to_production_ratio": number,
    "conversion_cost_per_kg": number,
    "material_yield_pct": number
  },
  "insights": ["string array of 3-5 key management insights"],
  "priorities": ["string array of top 3 immediate action items"]
}

Respond ONLY with valid JSON. No preamble, no markdown, no explanation.`;

const COLORS = {
  red: "#e24b4a", amber: "#ef9f27", green: "#639922", blue: "#378add",
  teal: "#1d9e75", purple: "#7f77dd", gray: "#888780", coral: "#d85a30"
};

function MetricCard({ label, value, unit = "", color = "blue", sub = "" }) {
  const colorMap = { blue: "#378add", green: "#639922", amber: "#ef9f27", red: "#e24b4a", teal: "#1d9e75", purple: "#7f77dd" };
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: colorMap[color] || colorMap.blue, lineHeight: 1.1 }}>
        {value !== null && value !== undefined ? value : "—"}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3, color: "var(--color-text-secondary)" }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function AlertBadge({ type, category, message, action }) {
  const cfg = {
    RED: { bg: "var(--color-background-danger)", border: "var(--color-border-danger)", text: "var(--color-text-danger)", icon: "ti-alert-triangle" },
    AMBER: { bg: "var(--color-background-warning)", border: "var(--color-border-warning)", text: "var(--color-text-warning)", icon: "ti-alert-circle" },
    GREEN: { bg: "var(--color-background-success)", border: "var(--color-border-success)", text: "var(--color-text-success)", icon: "ti-check" }
  }[type] || {};
  return (
    <div style={{ background: cfg.bg, border: `0.5px solid ${cfg.border}`, borderRadius: "var(--border-radius-md)", padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <i className={`ti ${cfg.icon}`} style={{ color: cfg.text, fontSize: 16, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: cfg.text, marginBottom: 2 }}>{category}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{message}</div>
        {action && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>→ {action}</div>}
      </div>
    </div>
  );
}

function GaugeBar({ label, value, max = 100, target, redAt, amberAt, unit = "%" }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= redAt ? COLORS.red : value >= amberAt ? COLORS.amber : COLORS.green;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontWeight: 500, color }}>{value !== null ? `${value}${unit}` : "—"}</span>
      </div>
      <div style={{ height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      {target && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>Target: &lt;{target}{unit}</div>}
    </div>
  );
}

function WasteChart({ contractors }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !contractors?.length) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = () => {
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: contractors.map(c => c.name),
          datasets: [{
            label: "Waste %",
            data: contractors.map(c => c.waste_pct),
            backgroundColor: contractors.map(c => c.waste_pct > 7 ? "#e24b4a" : c.waste_pct > 5 ? "#ef9f27" : "#639922"),
            borderRadius: 4, barThickness: 40
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw}% waste` } } },
          scales: {
            y: { beginAtZero: true, max: 12, grid: { color: "rgba(128,128,128,0.15)" }, ticks: { callback: v => `${v}%`, font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { size: 12 } } }
          },
          animation: { duration: 800 }
        }
      });
    };
    document.head.appendChild(script);
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [contractors]);
  return (
    <div style={{ position: "relative", height: 180 }}>
      <canvas ref={canvasRef} role="img" aria-label="Contractor waste percentage comparison bar chart">Contractor waste comparison chart</canvas>
    </div>
  );
}

function ProductionChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    const labels = ["Tape", "Weaving", "Lamination"];
    const values = [data.tape_production_kg, data.weaving_production_kg, data.lamination_production_kg];
    const load = () => {
      if (!window.Chart) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: ["#1d9e75", "#378add", "#7f77dd"], borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "68%",
          plugins: { legend: { display: false } },
          animation: { duration: 800 }
        }
      });
    };
    if (window.Chart) load();
    else { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"; s.onload = load; document.head.appendChild(s); }
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);
  const total = (data?.tape_production_kg || 0) + (data?.weaving_production_kg || 0) + (data?.lamination_production_kg || 0);
  return (
    <div>
      <div style={{ position: "relative", height: 160 }}>
        <canvas ref={canvasRef} role="img" aria-label="Plant-wise production split doughnut chart">Plant production split</canvas>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{total ? (total / 1000).toFixed(1) + "t" : "—"}</div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>total</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
        {[["Tape", "#1d9e75"], ["Weaving", "#378add"], ["Lami", "#7f77dd"]].map(([l, c]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function OperatorTable({ operators }) {
  if (!operators?.length) return <div style={{ color: "var(--color-text-tertiary)", fontSize: 13, padding: "8px 0" }}>No operator data</div>;
  const sorted = [...operators].sort((a, b) => (a.diff || 0) - (b.diff || 0));
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Operator", "Looms", "Target (Mtr)", "Actual (Mtr)", "DIFF"].map(h => (
              <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((op, i) => {
            const diffColor = op.diff < -300 ? COLORS.red : op.diff < -150 ? COLORS.amber : COLORS.green;
            return (
              <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "7px 8px", fontWeight: op.diff < -300 ? 500 : 400 }}>{op.operator}</td>
                <td style={{ padding: "7px 8px", color: "var(--color-text-secondary)" }}>{op.loom_nos}</td>
                <td style={{ padding: "7px 8px" }}>{op.target_mtr?.toLocaleString() || "—"}</td>
                <td style={{ padding: "7px 8px" }}>{op.actual_mtr?.toLocaleString() || "—"}</td>
                <td style={{ padding: "7px 8px", color: diffColor, fontWeight: 500 }}>{op.diff > 0 ? "+" : ""}{op.diff?.toLocaleString() || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RMStockTable({ materials }) {
  if (!materials?.length) return <div style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No RM data</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Material", "Closing (KG)", "Daily Use (KG)", "Days Left", "Status"].map(h => (
              <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {materials.slice(0, 12).map((m, i) => {
            const days = m.days_remaining;
            const status = days <= 3 ? { label: "Critical", color: COLORS.red } : days <= 7 ? { label: "Low", color: COLORS.amber } : { label: "OK", color: COLORS.green };
            return (
              <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "7px 8px" }}>{m.name} <span style={{ color: "var(--color-text-tertiary)", fontSize: 10 }}>{m.code}</span></td>
                <td style={{ padding: "7px 8px" }}>{m.closing_stock_kg?.toLocaleString() || "—"}</td>
                <td style={{ padding: "7px 8px" }}>{m.daily_consumption_kg?.toLocaleString() || "—"}</td>
                <td style={{ padding: "7px 8px", fontWeight: days <= 3 ? 500 : 400, color: days <= 3 ? COLORS.red : "inherit" }}>{days !== null && days !== undefined ? days.toFixed(1) : "—"}</td>
                <td style={{ padding: "7px 8px" }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: status.color, background: `${status.color}18`, padding: "2px 8px", borderRadius: 10 }}>{status.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DispatchCard({ dispatch }) {
  if (!dispatch) return null;
  const ratio = dispatch.today_kg && dispatch.today_kg > 0 ? (dispatch.today_kg / Math.max(1, dispatch.today_kg * 0.6)).toFixed(1) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <MetricCard label="Today Dispatch" value={dispatch.today_kg?.toLocaleString()} unit="KG" color="blue" />
      <MetricCard label="Cumulative Dispatch" value={dispatch.cumulative_kg ? (dispatch.cumulative_kg / 1000).toFixed(0) + "t" : null} unit="" color="teal" />
      <MetricCard label="Local" value={dispatch.local_kg?.toLocaleString()} unit="KG" color="purple" />
      <MetricCard label="Export" value={dispatch.export_kg?.toLocaleString()} unit="KG" color="amber" />
    </div>
  );
}

function DeptCostChart({ departments }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !departments?.length) return;
    const top = [...departments].sort((a, b) => b.cost - a.cost).slice(0, 6);
    const load = () => {
      if (!window.Chart) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new window.Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: top.map(d => d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name),
          datasets: [{ label: "Cost (₹)", data: top.map(d => d.cost), backgroundColor: "#378add", borderRadius: 4, barThickness: 28 }]
        },
        options: {
          indexAxis: "y", responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: "rgba(128,128,128,0.1)" }, ticks: { callback: v => `₹${(v / 1000).toFixed(0)}k`, font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    };
    if (window.Chart) load();
    else { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"; s.onload = load; document.head.appendChild(s); }
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [departments]);
  return (
    <div style={{ position: "relative", height: Math.max(160, (departments?.length || 1) * 32) }}>
      <canvas ref={canvasRef} role="img" aria-label="Department cost horizontal bar chart">Department cost breakdown</canvas>
    </div>
  );
}

const SECTION_TABS = ["Overview", "Wastage", "Operators", "Inventory", "Dispatch", "Labour"];

export default function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [history, setHistory] = useState([]);
  const fileRef = useRef();

  const processFiles = useCallback(async (files) => {
    if (!files.length) return;
    setIsProcessing(true);
    setError("");
    setProcessingStatus("Reading uploaded files…");

    try {
      const contents = await Promise.all(Array.from(files).map(f => new Promise((res, rej) => {
        const r = new FileReader();
        if (f.type.startsWith("image/")) {
          r.onload = () => res({ type: "image", name: f.name, data: r.result.split(",")[1], mimeType: f.type });
          r.onerror = rej;
          r.readAsDataURL(f);
        } else if (f.type === "application/pdf") {
          r.onload = () => res({ type: "document", name: f.name, data: r.result.split(",")[1], mimeType: "application/pdf" });
          r.onerror = rej;
          r.readAsDataURL(f);
        } else {
          r.onload = () => res({ type: "text", name: f.name, data: r.result });
          r.onerror = rej;
          r.readAsText(f);
        }
      })));

      setProcessingStatus("Sending to AI for analysis…");

      const userContent = [
        { type: "text", text: `Analyze these ${contents.length} manufacturing report file(s) and extract all data into the specified JSON format. Files: ${contents.map(c => c.name).join(", ")}` },
        ...contents.map(c => {
          if (c.type === "image") return { type: "image", source: { type: "base64", media_type: c.mimeType, data: c.data } };
          if (c.type === "document") return { type: "document", source: { type: "base64", media_type: "application/pdf", data: c.data } };
          return { type: "text", text: `File: ${c.name}\n\n${c.data}` };
        })
      ];

      const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3001") + "/api/analyze";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }]
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const apiData = await response.json();
      setProcessingStatus("Parsing results…");

      const text = apiData.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);

      setReportData(parsed);
      setHistory(h => [{ date: parsed.report_date || new Date().toLocaleDateString("en-GB"), files: files.length, data: parsed }, ...h].slice(0, 10));
      setProcessingStatus("");
      setActiveTab("Overview");
    } catch (e) {
      setError(`Analysis failed: ${e.message}. Please try again or check file format.`);
      setProcessingStatus("");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith("image/") || f.type === "application/pdf" ||
      f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv") || f.name.endsWith(".txt")
    );
    if (files.length) { setUploadedFiles(files); processFiles(files); }
  }, [processFiles]);

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length) { setUploadedFiles(files); processFiles(files); }
  }, [processFiles]);

  const d = reportData;

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", maxWidth: 900, margin: "0 auto", padding: "0 0 40px" }}>
      <h2 className="sr-only">Radha Darshan Petropack — AI Manufacturing Intelligence Dashboard</h2>

      {/* Header */}
      <div style={{ padding: "20px 0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Radha Darshan Petropack LLP</div>
            <div style={{ fontSize: 20, fontWeight: 500 }}>Manufacturing Intelligence</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {d && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "4px 10px", borderRadius: "var(--border-radius-md)" }}>Report: {d.report_date}</div>}
            <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "7px 14px", cursor: "pointer" }}>
              <i className="ti ti-upload" style={{ fontSize: 15 }} aria-hidden="true" />Upload Report
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.csv,.txt" onChange={handleFileChange} style={{ display: "none" }} />
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {!d && !isProcessing && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{ border: "1px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", padding: "48px 24px", textAlign: "center", cursor: "pointer", marginBottom: 24, transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <i className="ti ti-file-spreadsheet" style={{ fontSize: 36, color: "var(--color-text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true" />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Upload your daily manufacturing report</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Drag & drop Excel, PDF, images, or CSV files here</div>
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Supports all 7 report types — the AI handles cleaning, analysis, and KPIs automatically</div>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", marginBottom: 24 }}>
          <div style={{ fontSize: 24, marginBottom: 12, animation: "spin 1.5s linear infinite", display: "inline-block" }}>
            <i className="ti ti-loader" style={{ fontSize: 32, color: "#378add" }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{processingStatus}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Analyzing {uploadedFiles.length} file(s) — extracting KPIs, alerts, and insights…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--color-text-danger)" }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 8 }} aria-hidden="true" />{error}
        </div>
      )}

      {/* Dashboard */}
      {d && !isProcessing && (
        <>
          {/* Alerts row */}
          {d.alerts?.filter(a => a.type === "RED").length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Immediate Actions Required</div>
              <div style={{ display: "grid", gap: 8 }}>
                {d.alerts.filter(a => a.type === "RED").map((a, i) => <AlertBadge key={i} {...a} />)}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20, overflowX: "auto" }}>
            {SECTION_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab ? 500 : 400, cursor: "pointer",
                background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #378add" : "2px solid transparent",
                color: activeTab === tab ? "#378add" : "var(--color-text-secondary)", whiteSpace: "nowrap"
              }}>{tab}</button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "Overview" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <MetricCard label="Total Production" value={d.summary?.total_production_kg?.toLocaleString()} unit="KG" color="blue" />
                <MetricCard label="Running Looms" value={(d.summary?.running_looms_day || 0) + (d.summary?.running_looms_night || 0)} unit="avg" color="teal" sub={`Day: ${d.summary?.running_looms_day} · Night: ${d.summary?.running_looms_night}`} />
                <MetricCard label="Conv. Cost" value={d.summary?.conversion_cost_per_kg || ((d.summary?.labour_cost_per_kg || 0) + (d.summary?.electric_cost_per_kg || 0)).toFixed(1)} unit="₹/KG" color={((d.summary?.labour_cost_per_kg || 0) + (d.summary?.electric_cost_per_kg || 0)) > 13 ? "red" : "green"} />
                <MetricCard label="Dispatch" value={d.dispatch?.today_kg?.toLocaleString()} unit="KG" color="purple" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Plant-wise output</div>
                  <ProductionChart data={d.summary} />
                </div>
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>Waste benchmarks</div>
                  <GaugeBar label="Weaving waste" value={d.summary?.weaving_waste_pct} max={15} target={5} redAt={6} amberAt={5} />
                  <GaugeBar label="Tape waste" value={d.summary?.tape_waste_pct} max={10} target={2} redAt={3} amberAt={2} />
                  <GaugeBar label="Lamination waste" value={d.summary?.lamination_waste_pct} max={5} target={1.5} redAt={2} amberAt={1.5} />
                </div>
              </div>

              {/* Derived KPIs */}
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Derived KPIs</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  <MetricCard label="OEE" value={d.kpis?.oee_pct?.toFixed(1)} unit="%" color={d.kpis?.oee_pct >= 75 ? "green" : d.kpis?.oee_pct >= 60 ? "amber" : "red"} sub="Target >75%" />
                  <MetricCard label="Tape→Weaving" value={d.kpis?.tape_to_weaving_ratio?.toFixed(2)} unit="" color="teal" sub="Target 0.98–1.02" />
                  <MetricCard label="Dispatch/Prod" value={d.kpis?.dispatch_to_production_ratio?.toFixed(2)} unit="×" color={d.kpis?.dispatch_to_production_ratio > 1.5 ? "amber" : "green"} sub="Target 0.9–1.1" />
                  <MetricCard label="Labour cost" value={d.summary?.labour_cost_per_kg?.toFixed(1)} unit="₹/KG" color={d.summary?.labour_cost_per_kg > 10 ? "amber" : "green"} />
                  <MetricCard label="Electric cost" value={d.summary?.electric_cost_per_kg?.toFixed(2)} unit="₹/KG" color="blue" />
                </div>
              </div>

              {/* Insights */}
              {d.insights?.length > 0 && (
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI insights</div>
                  {d.insights.map((ins, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < d.insights.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                      <i className="ti ti-bulb" style={{ fontSize: 14, color: "#ef9f27", marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
                      <div style={{ fontSize: 13 }}>{ins}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Amber alerts */}
              {d.alerts?.filter(a => a.type !== "RED").length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>All alerts</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {d.alerts.filter(a => a.type !== "RED").map((a, i) => <AlertBadge key={i} {...a} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wastage Tab */}
          {activeTab === "Wastage" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contractor waste comparison</div>
                {d.contractors?.length > 0 ? <WasteChart contractors={d.contractors} /> : <div style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No contractor data available</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {d.contractors?.map(c => (
                  <div key={c.name} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Running looms: Day {c.running_looms_day} · Night {c.running_looms_night}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Production: {c.production_mtr?.toLocaleString()} Mtr / {c.production_kg?.toLocaleString()} KG</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Pipe cut: {c.pipe_cut_kg?.toLocaleString()} KG</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: c.waste_pct > 7 ? COLORS.red : c.waste_pct > 5 ? COLORS.amber : COLORS.green }}>
                      Waste: {c.waste_pct}%
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tape line waste</div>
                {d.tape_lines?.map(t => (
                  <div key={t.line} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>{t.line}</span>
                      <span style={{ color: t.waste_pct > 3 ? COLORS.red : t.waste_pct > 2 ? COLORS.amber : COLORS.green, fontWeight: 500 }}>{t.waste_pct}% waste · {t.waste_kg} KG</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, color: "var(--color-text-secondary)" }}>
                      <span>Day: {t.production_kg_day?.toLocaleString()} KG</span>
                      <span>Night: {t.production_kg_night?.toLocaleString()} KG</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operators Tab */}
          {activeTab === "Operators" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10 }}>
                {d.loom_operators?.length > 0 && (() => {
                  const neg = d.loom_operators.filter(o => (o.diff || 0) < -300);
                  const total = d.loom_operators.reduce((s, o) => s + (o.diff || 0), 0);
                  return <>
                    <MetricCard label="Total operators" value={d.loom_operators.length} color="blue" />
                    <MetricCard label="Underperforming" value={neg.length} unit=" ops" color={neg.length > 2 ? "red" : "amber"} sub="DIFF < -300" />
                    <MetricCard label="Total DIFF" value={total?.toLocaleString()} unit=" Mtr" color={total < -5000 ? "red" : "amber"} />
                  </>;
                })()}
              </div>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Operator performance vs target (sorted by DIFF)</div>
                <OperatorTable operators={d.loom_operators} />
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === "Inventory" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Raw material stock levels</div>
                <RMStockTable materials={d.raw_materials} />
              </div>
              {d.raw_materials?.filter(m => m.days_remaining <= 3).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Critical stockouts (&lt;3 days)</div>
                  {d.raw_materials.filter(m => m.days_remaining <= 3).map((m, i) => (
                    <AlertBadge key={i} type="RED" category="Raw Material Critical" message={`${m.name}: ${m.days_remaining?.toFixed(1)} days remaining (${m.closing_stock_kg?.toLocaleString()} KG closing)`} action={`Raise PO immediately for minimum ${(m.daily_consumption_kg * 7)?.toFixed(0)} KG (7-day safety stock)`} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dispatch Tab */}
          {activeTab === "Dispatch" && (
            <div style={{ display: "grid", gap: 20 }}>
              <DispatchCard dispatch={d.dispatch} />
              {d.dispatch?.parties?.length > 0 && (
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Party-wise dispatch</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        {["Party", "Area", "Qty (KG)"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 500 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {d.dispatch.parties.map((p, i) => (
                        <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          <td style={{ padding: "8px 8px" }}>{p.name}</td>
                          <td style={{ padding: "8px 8px", color: "var(--color-text-secondary)" }}>{p.area}</td>
                          <td style={{ padding: "8px 8px", fontWeight: 500 }}>{p.qty_kg?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Labour Tab */}
          {activeTab === "Labour" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10 }}>
                <MetricCard label="Total labour cost" value={d.summary?.total_labour_cost ? "₹" + (d.summary.total_labour_cost / 1000).toFixed(0) + "k" : null} color="blue" />
                <MetricCard label="Electric cost" value={d.summary?.total_electric_cost ? "₹" + (d.summary.total_electric_cost / 1000).toFixed(0) + "k" : null} color="amber" />
                <MetricCard label="Labour / KG" value={d.summary?.labour_cost_per_kg?.toFixed(2)} unit="₹" color={d.summary?.labour_cost_per_kg > 10 ? "amber" : "green"} />
                <MetricCard label="Electric / KG" value={d.summary?.electric_cost_per_kg?.toFixed(2)} unit="₹" color="teal" />
              </div>
              {d.departments?.length > 0 && (
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Department cost breakdown</div>
                  <DeptCostChart departments={d.departments} />
                </div>
              )}
              {d.departments?.length > 0 && (
                <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        {["Department", "Headcount", "Cost (₹)", "Cost %"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 500 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {d.departments.sort((a, b) => b.cost - a.cost).map((dept, i) => (
                        <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          <td style={{ padding: "7px 8px" }}>{dept.name}</td>
                          <td style={{ padding: "7px 8px" }}>{dept.headcount}</td>
                          <td style={{ padding: "7px 8px" }}>₹{dept.cost?.toLocaleString()}</td>
                          <td style={{ padding: "7px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                                <div style={{ width: `${Math.min(dept.cost_pct || 0, 100)}%`, height: "100%", background: "#378add", borderRadius: 3 }} />
                              </div>
                              <span style={{ minWidth: 30, textAlign: "right" }}>{dept.cost_pct?.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bottom action: upload another */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "7px 14px", cursor: "pointer" }}>
              <i className="ti ti-upload" style={{ fontSize: 15 }} aria-hidden="true" />Upload next day's report
            </button>
            {history.length > 1 && (
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{history.length} reports analysed this session</span>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }`}</style>
    </div>
  );
}
