// import { NextResponse } from "next/server";
// import { sql } from "@/lib/db";

// function json(status, body) {
//   return NextResponse.json(body, { status });
// }

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);

//   const deviceId = searchParams.get("deviceId") || "";
//   const minutes = Number(searchParams.get("minutes") || "15");
//   const metric = searchParams.get("metric") || ""; // e.g. knee_rom_avg

//   if (!deviceId || !metric || !Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
//     return json(400, { ok: false, error: "bad_query" });
//   }

//   // Pull points in time order
//   let rows;
//   try {
//     rows = await sql`
//       select
//         extract(epoch from bucket_start)::bigint as ts,
//         metrics ->> ${metric} as val
//       from telemetry_points
//       where device_id = ${deviceId}
//         and bucket_start >= now() - (${String(minutes)} || ' minutes')::interval
//       order by bucket_start asc
//     `;
//   } catch {
//     return json(500, { ok: false, error: "db_query_failed" });
//   }

//   // Convert to numeric points; skip missing values
//   const points = [];
//   for (const r of rows) {
//     const ts = Number(r.ts);
//     const v = r.val === null ? NaN : Number(r.val);
//     if (Number.isFinite(ts) && Number.isFinite(v)) points.push([ts, v]);
//   }

//   return json(200, {
//     ok: true,
//     deviceId,
//     metric,
//     bucketSec: 5,
//     points
//   });
// }



// import { NextResponse } from "next/server";
// import { sql } from "@/lib/db";

// function json(status, body) {
//   return NextResponse.json(body, { status });
// }

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);

//   const deviceId = searchParams.get("deviceId") || "";
//   const minutes = Number(searchParams.get("minutes") || "15");

//   // Support either single metric= or metrics=comma,separated
//   const metricSingle = (searchParams.get("metric") || "").trim();
//   const metricsCsv = (searchParams.get("metrics") || "").trim();

//   const metrics = metricsCsv
//     ? metricsCsv.split(",").map((s) => s.trim()).filter(Boolean)
//     : metricSingle
//       ? [metricSingle]
//       : [];

//   if (!deviceId || !metrics.length || !Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
//     return json(400, { ok: false, error: "bad_query" });
//   }

//   let rows;
//   try {
//     rows = await sql`
//       select
//         extract(epoch from bucket_start)::bigint as ts,
//         metrics
//       from telemetry_points
//       where device_id = ${deviceId}
//         and bucket_start >= now() - (${String(minutes)} || ' minutes')::interval
//       order by bucket_start asc
//     `;
//   } catch {
//     return json(500, { ok: false, error: "db_query_failed" });
//   }

//   // Build series: { metricKey: [[ts,val], ...], ... }
//   const series = {};
//   for (const m of metrics) series[m] = [];

//   for (const r of rows) {
//     const ts = Number(r.ts);
//     if (!Number.isFinite(ts)) continue;

//     const obj = r.metrics || {};
//     for (const m of metrics) {
//       const vRaw = obj[m];
//       const v = typeof vRaw === "string" ? Number(vRaw) : Number(vRaw);
//       if (Number.isFinite(v)) series[m].push([ts, v]);
//     }
//   }

//   return json(200, { ok: true, deviceId, bucketSec: 5, minutes, series });
// }





// import { NextResponse } from "next/server";
// import { sql } from "@/lib/db";

// function json(status, body) {
//   return NextResponse.json(body, { status });
// }

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);

//   const deviceId = searchParams.get("deviceId");
//   const minutes = Number(searchParams.get("minutes") || "15");
//   const metricsCsv = searchParams.get("metrics");

//   if (!deviceId || !metricsCsv) {
//     return json(400, { ok:false, error:"bad_query" });
//   }

//   const metrics = metricsCsv.split(",").map(m=>m.trim());

//   const rows = await sql`
//     select extract(epoch from bucket_start)::bigint as ts, metrics
//     from telemetry_points
//     where device_id=${deviceId}
//       and bucket_start >= now() - (${String(minutes)} || ' minutes')::interval
//     order by bucket_start asc
//   `;

//   const series = {};
//   metrics.forEach(m => series[m] = []);

//   for (const r of rows) {
//     const ts = Number(r.ts);
//     const obj = r.metrics || {};
//     metrics.forEach(m => {
//       const v = Number(obj[m]);
//       if (Number.isFinite(v)) series[m].push([ts, v]);
//     });
//   }

//   return json(200, { ok:true, deviceId, bucketSec:5, series });
// }










// import { NextResponse } from "next/server";
// import { sql } from "@/lib/db";

// function json(status, body) {
//   return NextResponse.json(body, { status });
// }

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);

//   const deviceId = searchParams.get("deviceId");
//   const minutes = Number(searchParams.get("minutes") || "15");
//   const metricsCsv = searchParams.get("metrics");

//   if (!deviceId || !metricsCsv) {
//     return json(400, { ok: false, error: "bad_query" });
//   }
//   if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
//     return json(400, { ok: false, error: "bad_minutes" });
//   }

//   const metrics = metricsCsv
//     .split(",")
//     .map((m) => m.trim())
//     .filter(Boolean);

//   if (!metrics.length) {
//     return json(400, { ok: false, error: "no_metrics" });
//   }

//   let rows;
//   try {
//     rows = await sql`
//       select extract(epoch from bucket_start)::bigint as ts, metrics
//       from telemetry_points
//       where device_id = ${deviceId}
//         and bucket_start >= now() - (${String(minutes)} || ' minutes')::interval
//       order by bucket_start asc
//     `;
//   } catch {
//     return json(500, { ok: false, error: "db_query_failed" });
//   }

//   const series = {};
//   for (const m of metrics) series[m] = [];

//   for (const r of rows) {
//     const ts = Number(r.ts);
//     const obj = r.metrics || {};
//     for (const m of metrics) {
//       const v = Number(obj[m]);
//       if (Number.isFinite(v)) series[m].push([ts, v]);
//     }
//   }

//   return json(200, { ok:true, deviceId, bucketSec: 2, series });

// }







import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

function json(status, body) {
  return NextResponse.json(body, { status });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const deviceId = searchParams.get("deviceId");
  const minutes = Number(searchParams.get("minutes") || "15");
  const metricsCsv = searchParams.get("metrics");

  if (!deviceId || !metricsCsv) {
    return json(400, { ok: false, error: "bad_query" });
  }
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
    return json(400, { ok: false, error: "bad_minutes" });
  }

  const metrics = metricsCsv.split(",").map(m => m.trim()).filter(Boolean);
  if (!metrics.length) {
    return json(400, { ok: false, error: "no_metrics" });
  }

  let rows;
  try {
    rows = await sql`
      select extract(epoch from bucket_start)::bigint as ts, metrics
      from telemetry_points
      where device_id = ${deviceId}
        and bucket_start >= now() - (${String(minutes)} || ' minutes')::interval
      order by bucket_start asc
    `;
  } catch {
    return json(500, { ok: false, error: "db_query_failed" });
  }

  const series = {};
  for (const m of metrics) series[m] = [];

  for (const r of rows) {
    const ts = Number(r.ts);
    const obj = r.metrics || {};
    for (const m of metrics) {
      const v = Number(obj[m]);
      if (Number.isFinite(v)) series[m].push([ts, v]);
    }
  }

  return json(200, { ok: true, deviceId, bucketSec: 2, series });
}
