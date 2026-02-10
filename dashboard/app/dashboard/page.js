"use client";
import React, { useEffect, useMemo, useState } from "react";

// Helper for Tailwind classes
function cls(...a) { return a.filter(Boolean).join(" "); }

// Professional Card with subtle hover effect
function Card({ className, children }) {
  return (
    <div className={cls("rounded-[2rem] border border-gray-100 shadow-sm bg-white transition-all hover:shadow-md", className)}>
      {children}
    </div>
  );
}

function Pill({ children, active }) {
  return (
    <span className={cls(
      "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border",
      active ? "bg-black text-white border-black" : "bg-gray-50 text-gray-500 border-gray-200"
    )}>
      {children}
    </span>
  );
}

function Stat({ label, value, sub, tone = "neutral" }) {
  const themes = {
    lime: "bg-emerald-50/50 text-emerald-700 border-emerald-100",
    sky: "bg-blue-50/50 text-blue-700 border-blue-100",
    pink: "bg-rose-50/50 text-rose-700 border-rose-100",
    amber: "bg-amber-50/50 text-amber-700 border-amber-100",
    neutral: "bg-gray-50/50 text-gray-700 border-gray-100"
  };

  return (
    <Card className={cls("p-6 flex flex-col justify-between min-h-[140px]", themes[tone])}>
      <div>
        <div className="text-[10px] uppercase font-bold tracking-[0.15em] opacity-70">{label}</div>
        <div className="mt-2 text-4xl font-light tracking-tight">
          {value}
        </div>
      </div>
      {sub && <div className="mt-2 text-xs font-medium opacity-60 flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-current" /> {sub}
      </div>}
    </Card>
  );
}

function LineChart({ title, subtitle, seriesMap }) {
  const width = 800;
  const height = 240;
  const keys = Object.keys(seriesMap || {});
  const allPoints = keys.flatMap(k => seriesMap[k] || []);
  const hasData = allPoints.length >= 2;

  if (!hasData) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center opacity-60 border-dashed">
        <div className="w-12 h-12 rounded-full bg-gray-50 mb-3" />
        <div className="font-medium">{title}</div>
        <div className="text-sm">Awaiting stream...</div>
      </Card>
    );
  }

  const xs = allPoints.map(p => p[0]);
  const ys = allPoints.map(p => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin0 = Math.min(...ys), yMax0 = Math.max(...ys);
  const pad = (yMax0 - yMin0) * 0.15 || 1;
  const yMin = yMin0 - pad, yMax = yMax0 + pad;

  const scaleX = (x) => 10 + ((x - xMin) / (xMax - xMin || 1)) * (width - 20);
  const scaleY = (y) => (height - 10) - ((y - yMin) / (yMax - yMin || 1)) * (height - 20);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-1">
          {keys.map((k, i) => (
             <span key={k} className="w-2 h-2 rounded-full mt-1" style={{backgroundColor: i===0 ? '#000' : '#9ca3af'}} />
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Subtle Grid Lines */}
          <line x1="0" y1={scaleY(yMin0)} x2={width} y2={scaleY(yMin0)} stroke="#f3f4f6" strokeWidth="1" />
          <line x1="0" y1={scaleY(yMax0)} x2={width} y2={scaleY(yMax0)} stroke="#f3f4f6" strokeWidth="1" />

          {keys.map((k, i) => {
            const pts = seriesMap[k] || [];
            if (pts.length < 2) return null;
            let d = `M ${scaleX(pts[0][0])} ${scaleY(pts[0][1])}`;
            for (let j = 1; j < pts.length; j++) {
              d += ` L ${scaleX(pts[j][0])} ${scaleY(pts[j][1])}`;
            }
            return (
              <path
                key={k}
                d={d}
                fill="none"
                stroke={i === 0 ? "black" : "#9ca3af"}
                strokeWidth={i === 0 ? "2.5" : "1.5"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={i === 1 ? "4 4" : "0"}
              />
            );
          })}
        </svg>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [deviceId, setDeviceId] = useState("esp8266-01");
  const [minutes, setMinutes] = useState(15);
  const [series, setSeries] = useState({});
  const [err, setErr] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  const METRICS = useMemo(() => ([
    "dw_mag_avg","dw_mag_max","dw_s_avg","rep_total","rep_active","rom_proxy_deg_last","rep_dur_last_s","g1_mag_avg","g2_mag_avg","dom_avg"
  ]), []);

  async function load() {
    try {
      const url = `/api/timeseries?deviceId=${encodeURIComponent(deviceId)}&minutes=${encodeURIComponent(minutes)}&metrics=${encodeURIComponent(METRICS.join(","))}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "fetch_failed");
      setSeries(j.series || {});
      setLastUpdate(Date.now());
      setErr("");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);

    return () => clearInterval(t);
  }, [deviceId, minutes]);

  const latest = (k) => {
    const pts = series?.[k];
    return (pts && pts.length) ? pts[pts.length - 1][1] : null;
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900 font-sans antialiased pb-20">
      {/* Top Navigation / Status Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 mb-8">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">PF</div>
            <span className="font-bold tracking-tighter text-xl italic">PHYSIO<span className="text-gray-400">FLOW</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Pill active={latest("rep_active") === 1}>{latest("rep_active") === 1 ? "● Live Rep" : "Standby"}</Pill>
            <div className="text-[10px] text-gray-400 font-mono uppercase ml-2">
               {lastUpdate ? `Sync: ${new Date(lastUpdate).toLocaleTimeString()}` : "Syncing..."}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-5xl font-light tracking-tight text-gray-900">Motion Intelligence</h1>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Real-time biomechanical analysis. Monitoring dual-MPU variance and ROM proxies with low-latency debouncing.
            </p>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-[2rem] border border-gray-200">
             <input 
               className="bg-transparent px-4 py-2 text-sm focus:outline-none w-32" 
               value={deviceId} 
               onChange={(e)=>setDeviceId(e.target.value)} 
             />
             <button onClick={load} className="bg-white px-6 py-2 rounded-[1.8rem] text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">
               Refresh
             </button>
          </div>
        </header>

        {/* Infographic KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat
            tone="lime"
            label="Total Volume"
            value={latest("rep_total") == null ? "—" : Math.round(latest("rep_total"))}
            sub="Completed repetitions"
          />
          <Stat
            tone="sky"
            label="Intensity"
            value={latest("dw_s_avg") == null ? "—" : Number(latest("dw_s_avg")).toFixed(2)}
            sub="Rad/s smoothed signal"
          />
          <Stat
            tone="pink"
            label="Range of Motion"
            value={latest("rom_proxy_deg_last") == null ? "—" : Number(latest("rom_proxy_deg_last")).toFixed(0) + "°"}
            sub={`Last: ${Number(latest("rep_dur_last_s") || 0).toFixed(1)}s`}
          />
          <Stat
            tone="amber"
            label="Symmetry"
            value={latest("dom_avg") == null ? "—" : Number(latest("dom_avg")).toFixed(3)}
            sub="Sensor Δ Dominance"
          />
        </div>

        {/* Main Analytics Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <LineChart
              title="Kinetic Displacement"
              subtitle="Angular velocity magnitude (Avg vs Max)"
              seriesMap={{
                avg: series.dw_mag_avg || [],
                max: series.dw_mag_max || [],
              }}
            />
            <LineChart
              title="Sensor Delta"
              subtitle="Comparison between Primary and Secondary MPU"
              seriesMap={{
                g1: series.g1_mag_avg || [],
                g2: series.g2_mag_avg || [],
              }}
            />
          </div>
          <div className="lg:col-span-4 space-y-6">
             <Card className="p-6 bg-black text-white border-none h-full min-h-[300px]">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Signal Health</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span>Buffer Stability</span>
                      <span>98%</span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[98%]" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-800">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Active Protocol</p>
                    <p className="text-lg font-light text-gray-200">ISO-Bilateral Debounce</p>
                  </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </main>
  );
}