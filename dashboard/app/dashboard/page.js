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
import React, { useEffect, useState } from "react";

function Chart({title, series}) {
  return (
    <div className="p-4 border rounded-xl bg-white">
      <h3 className="font-semibold mb-2">{title}</h3>
      <pre className="text-xs h-40 overflow-auto">
        {JSON.stringify(series,null,2)}
      </pre>
    </div>
  );
}

export default function DashboardPage(){
  const [data,setData]=useState({});

  const deviceId="esp8266-01";

  async function load(){
    const metrics=[
      "a1x_avg","a1y_avg","a1z_avg",
      "g1x_avg","g1y_avg","g1z_avg",
      "a2x_avg","a2y_avg","a2z_avg",
      "g2x_avg","g2y_avg","g2z_avg",
      "a1_mag_avg","a2_mag_avg",
      "g1_mag_avg","g2_mag_avg",
      "dw_mag_avg","dw_mag_max","dom_avg"
    ].join(",");

    const r=await fetch(`/api/timeseries?deviceId=${deviceId}&metrics=${metrics}&minutes=15`,{cache:"no-store"});
    const j=await r.json();
    if(j.ok) setData(j.series);
  }

  useEffect(()=>{
    load();
    const t=setInterval(load,5000);
    return ()=>clearInterval(t);
  },[]);

  return(
    <main className="p-6 max-w-7xl mx-auto grid gap-6">
      <h1 className="text-2xl font-semibold">Realtime Rehab Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Chart title="Accel Axes MPU1" series={{
          x:data.a1x_avg,
          y:data.a1y_avg,
          z:data.a1z_avg
        }} />

        <Chart title="Gyro Axes MPU1" series={{
          x:data.g1x_avg,
          y:data.g1y_avg,
          z:data.g1z_avg
        }} />

        <Chart title="Accel Magnitudes" series={{
          a1:data.a1_mag_avg,
          a2:data.a2_mag_avg
        }} />

        <Chart title="Relative Motion" series={{
          dw:data.dw_mag_avg,
          dw_max:data.dw_mag_max,
          dominance:data.dom_avg
        }} />
      </div>
    </main>
  );
}
