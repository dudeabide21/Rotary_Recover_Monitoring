// "use client";

// import React, { useEffect, useMemo, useState } from "react";

// function LineChart({ points, height = 220 }) {
//   // points: [[ts, val], ...]
//   const width = 900;

//   const values = points.map((p) => p[1]);
//   const min = values.length ? Math.min(...values) : 0;
//   const max = values.length ? Math.max(...values) : 1;
//   const pad = (max - min) * 0.1 || 1;

//   const yMin = min - pad;
//   const yMax = max + pad;

//   const path = useMemo(() => {
//     if (points.length < 2) return "";
//     const x0 = points[0][0];
//     const x1 = points[points.length - 1][0] || x0 + 1;
//     const dx = x1 - x0 || 1;

//     const scaleX = (ts) => ((ts - x0) / dx) * (width - 40) + 20;
//     const scaleY = (v) => {
//       const t = (v - yMin) / (yMax - yMin || 1);
//       return height - 20 - t * (height - 40);
//     };

//     let d = `M ${scaleX(points[0][0]).toFixed(2)} ${scaleY(points[0][1]).toFixed(2)}`;
//     for (let i = 1; i < points.length; i++) {
//       d += ` L ${scaleX(points[i][0]).toFixed(2)} ${scaleY(points[i][1]).toFixed(2)}`;
//     }
//     return d;
//   }, [points, height, yMin, yMax]);

//   return (
//     <div style={{ width: "100%", overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
//       <svg width={width} height={height} style={{ display: "block" }}>
//         {/* axes */}
//         <line x1="20" y1="20" x2="20" y2={height - 20} stroke="#ddd" />
//         <line x1="20" y1={height - 20} x2={width - 20} y2={height - 20} stroke="#ddd" />

//         {/* path */}
//         {path ? (
//           <path d={path} fill="none" stroke="black" strokeWidth="2" />
//         ) : (
//           <text x="20" y="40" fill="#777" fontSize="12">
//             Waiting for data…
//           </text>
//         )}

//         {/* min/max labels */}
//         <text x="28" y="24" fill="#777" fontSize="12">{yMax.toFixed(2)}</text>
//         <text x="28" y={height - 22} fill="#777" fontSize="12">{yMin.toFixed(2)}</text>
//       </svg>
//     </div>
//   );
// }

// export default function DashboardPage() {
//   // tweak these to match your device + metric names
//   const [deviceId, setDeviceId] = useState("esp8266-01");
//   const [metric, setMetric] = useState("knee_rom_avg");
//   const [minutes, setMinutes] = useState(15);

//   const [points, setPoints] = useState([]);
//   const [lastTs, setLastTs] = useState(null);
//   const [err, setErr] = useState("");

//   async function load() {
//     setErr("");
//     try {
//       const res = await fetch(
//         `/api/timeseries?deviceId=${encodeURIComponent(deviceId)}&metric=${encodeURIComponent(
//           metric
//         )}&minutes=${minutes}`,
//         { cache: "no-store" }
//       );
//       const data = await res.json();
//       if (!data?.ok) throw new Error(data?.error || "fetch_failed");
//       setPoints(data.points || []);
//       const lt = data.points?.length ? data.points[data.points.length - 1][0] : null;
//       setLastTs(lt);
//     } catch (e) {
//       setErr(String(e.message || e));
//     }
//   }

//   useEffect(() => {
//     load();
//     const t = setInterval(load, 5000);
//     return () => clearInterval(t);
//     // re-poll when inputs change
//   }, [deviceId, metric, minutes]);

//   return (
//     <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
//       <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
//         <h1 style={{ margin: 0, fontSize: 24 }}>Live Dashboard</h1>
//         <span style={{ opacity: 0.6 }}>updates every 5s</span>
//       </div>

//       <div
//         style={{
//           marginTop: 16,
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
//           gap: 12
//         }}
//       >
//         <label style={{ display: "grid", gap: 6 }}>
//           <span style={{ fontSize: 12, opacity: 0.7 }}>Device ID</span>
//           <input
//             value={deviceId}
//             onChange={(e) => setDeviceId(e.target.value)}
//             style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
//           />
//         </label>

//         <label style={{ display: "grid", gap: 6 }}>
//           <span style={{ fontSize: 12, opacity: 0.7 }}>Metric key</span>
//           <input
//             value={metric}
//             onChange={(e) => setMetric(e.target.value)}
//             style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
//           />
//         </label>

//         <label style={{ display: "grid", gap: 6 }}>
//           <span style={{ fontSize: 12, opacity: 0.7 }}>Window (minutes)</span>
//           <input
//             type="number"
//             min="1"
//             max="1440"
//             value={minutes}
//             onChange={(e) => setMinutes(Number(e.target.value))}
//             style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
//           />
//         </label>

//         <button
//           onClick={load}
//           style={{
//             alignSelf: "end",
//             padding: "10px 14px",
//             borderRadius: 10,
//             border: "1px solid #111",
//             background: "#111",
//             color: "white",
//             cursor: "pointer"
//           }}
//         >
//           Refresh
//         </button>
//       </div>

//       <div style={{ marginTop: 16 }}>
//         <LineChart points={points} />
//       </div>

//       <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
//         <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
//           <div style={{ fontSize: 12, opacity: 0.7 }}>Latest value</div>
//           <div style={{ fontSize: 20, fontWeight: 600 }}>
//             {points.length ? points[points.length - 1][1].toFixed(3) : "—"}
//           </div>
//         </div>

//         <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
//           <div style={{ fontSize: 12, opacity: 0.7 }}>Latest timestamp</div>
//           <div style={{ fontSize: 14, fontWeight: 600 }}>
//             {lastTs ? new Date(lastTs * 1000).toLocaleString() : "—"}
//           </div>
//         </div>

//         {err ? (
//           <div style={{ padding: 12, border: "1px solid #f3c", borderRadius: 12 }}>
//             <div style={{ fontSize: 12, opacity: 0.7 }}>Error</div>
//             <div style={{ fontSize: 14, fontWeight: 600 }}>{err}</div>
//           </div>
//         ) : null}
//       </div>

//       <details style={{ marginTop: 16 }}>
//         <summary style={{ cursor: "pointer" }}>Debug: last 10 points</summary>
//         <pre style={{ fontSize: 12, background: "#fafafa", padding: 12, borderRadius: 12 }}>
//           {JSON.stringify(points.slice(-10), null, 2)}
//         </pre>
//       </details>
//     </main>
//   );
// }







"use client";
import React, { useEffect, useMemo, useState } from "react";

function Panel({ title, children }) {
  return (
    <div className="p-4 sm:p-5 border rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-4 border rounded-2xl bg-white shadow-sm">
      <div className="text-xs uppercase tracking-widest text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SimpleLine({ points }) {
  // points: [[ts, val], ...]
  // lightweight SVG line (no libs)
  const width = 900;
  const height = 220;

  if (!points || points.length < 2) {
    return (
      <div className="text-sm text-gray-500 py-8">
        Waiting for data…
      </div>
    );
  }

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin0 = Math.min(...ys);
  const yMax0 = Math.max(...ys);
  const pad = (yMax0 - yMin0) * 0.1 || 1;
  const yMin = yMin0 - pad;
  const yMax = yMax0 + pad;

  const scaleX = (x) => 20 + ((x - xMin) / (xMax - xMin || 1)) * (width - 40);
  const scaleY = (y) => (height - 20) - ((y - yMin) / (yMax - yMin || 1)) * (height - 40);

  let d = `M ${scaleX(points[0][0]).toFixed(2)} ${scaleY(points[0][1]).toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${scaleX(points[i][0]).toFixed(2)} ${scaleY(points[i][1]).toFixed(2)}`;
  }

  return (
    <div className="w-full overflow-x-auto border rounded-xl">
      <svg width={width} height={height} className="block">
        <line x1="20" y1="20" x2="20" y2={height - 20} stroke="#e5e7eb" />
        <line x1="20" y1={height - 20} x2={width - 20} y2={height - 20} stroke="#e5e7eb" />
        <path d={d} fill="none" stroke="black" strokeWidth="2" />
        <text x="28" y="24" fill="#6b7280" fontSize="12">{yMax.toFixed(2)}</text>
        <text x="28" y={height - 22} fill="#6b7280" fontSize="12">{yMin.toFixed(2)}</text>
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [deviceId, setDeviceId] = useState("esp8266-01");
  const [minutes, setMinutes] = useState(15);

  // These MUST match what you’re currently storing in DB (your screenshot confirms these keys)
  const metricPresets = useMemo(() => ([
    { key: "knee_rom_avg", label: "Knee ROM (avg)" },
    { key: "knee_rom_max", label: "Knee ROM (max)" },
    { key: "smoothness_avg", label: "Smoothness (avg)" },
    { key: "rep_total", label: "Reps (total)" },
  ]), []);

  const [selectedMetric, setSelectedMetric] = useState("knee_rom_avg");

  const [series, setSeries] = useState({});
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  async function load() {
    setError("");

    const metrics = metricPresets.map(m => m.key).join(",");

    try {
      const res = await fetch(
        `/api/timeseries?deviceId=${encodeURIComponent(deviceId)}&minutes=${minutes}&metrics=${encodeURIComponent(metrics)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "fetch_failed");
      setSeries(data.series || {});
      setLastUpdate(Date.now());
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, minutes]);

  // Latest values for KPI cards
  const latest = (key) => {
    const pts = series?.[key];
    if (!pts || !pts.length) return "—";
    const v = pts[pts.length - 1][1];
    return Number.isFinite(v) ? v.toFixed(3) : "—";
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Realtime Rehab Dashboard
            </h1>
            <p className="text-gray-500 mt-2">
              Updates every 5 seconds {lastUpdate ? `• last: ${new Date(lastUpdate).toLocaleTimeString()}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
            <input
              className="border rounded-xl px-3 py-2"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="deviceId"
            />
            <input
              className="border rounded-xl px-3 py-2"
              type="number"
              min="1"
              max="1440"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              placeholder="minutes"
            />
            <button
              onClick={load}
              className="rounded-xl px-3 py-2 bg-black text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-5 p-4 border rounded-2xl bg-red-50 text-red-800">
            Error: {error}
          </div>
        ) : null}

        {/* KPI Cards */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="ROM Avg" value={latest("knee_rom_avg")} />
          <StatCard label="ROM Max" value={latest("knee_rom_max")} />
          <StatCard label="Smoothness" value={latest("smoothness_avg")} />
          <StatCard label="Reps Total" value={latest("rep_total")} />
        </div>

        {/* Main Chart */}
        <div className="mt-6 grid gap-4">
          <Panel title="Live Chart">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="text-sm text-gray-600">Metric</div>
              <select
                className="border rounded-xl px-3 py-2 w-full sm:w-72"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {metricPresets.map((m) => (
                  <option key={m.key} value={m.key}>{m.label} ({m.key})</option>
                ))}
              </select>
            </div>

            <SimpleLine points={series?.[selectedMetric] || []} />
          </Panel>

          {/* Debug panel (optional but useful) */}
          <Panel title="Debug: last 5 points per metric">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(
                Object.fromEntries(
                  metricPresets.map(m => [m.key, (series?.[m.key] || []).slice(-5)])
                ),
                null,
                2
              )}
            </pre>
          </Panel>
        </div>
      </div>
    </main>
  );
}
