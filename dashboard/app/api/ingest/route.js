// import { NextResponse } from "next/server";
// import { sql } from "@/lib/db";

// function json(status, body) {
//   return NextResponse.json(body, { status });
// }

// export async function POST(req) {
//   // --- Auth ---
//   const auth = req.headers.get("authorization") || "";
//   const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
//   if (!token || token !== process.env.DEVICE_TOKEN) {
//     return json(401, { ok: false, error: "unauthorized" });
//   }

//   // --- Parse ---
//   let body;
//   try {
//     body = await req.json();
//   } catch {
//     return json(400, { ok: false, error: "bad_json" });
//   }

//   const deviceId = body?.deviceId;
//   const bucketStart = body?.bucketStart; // epoch seconds
//   const bucketSec = body?.bucketSec ?? 5;
//   const metrics = body?.metrics;

//   // --- Validate (strict enough to avoid junk, flexible enough for hackathon) ---
//   if (typeof deviceId !== "string" || deviceId.length < 2) {
//     return json(400, { ok: false, error: "bad_deviceId" });
//   }
//   if (typeof bucketStart !== "number" || !Number.isFinite(bucketStart)) {
//     return json(400, { ok: false, error: "bad_bucketStart" });
//   }
//   if (bucketSec !== 5) {
//     return json(400, { ok: false, error: "bucketSec_must_be_5" });
//   }
//   if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
//     return json(400, { ok: false, error: "bad_metrics" });
//   }

//   // Option A: trust ESP time bucketStart
//   const bucketIso = new Date(bucketStart * 1000).toISOString();

//   // Insert row
//   try {
//     await sql`
//       insert into telemetry_points (device_id, bucket_start, bucket_sec, metrics)
//       values (${deviceId}, ${bucketIso}::timestamptz, 5, ${JSON.stringify(metrics)}::jsonb)
//     `;
//   } catch (e) {
//     // Neon errors can be verbose; return minimal info
//     return json(500, { ok: false, error: "db_insert_failed" });
//   }

//   return json(200, { ok: true });
// }



import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const BUCKET_SEC = 5;

function json(status, body) {
  return NextResponse.json(body, { status });
}

export async function POST(req) {
  // Auth
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== process.env.DEVICE_TOKEN) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  // Parse
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "bad_json" });
  }

  const { deviceId, bucketStart, bucketSec, metrics } = body || {};

  if (!deviceId || typeof deviceId !== "string") {
    return json(400, { ok: false, error: "bad_deviceId" });
  }
  if (!Number.isFinite(bucketStart)) {
    return json(400, { ok: false, error: "bad_bucketStart" });
  }
  if (!metrics || typeof metrics !== "object") {
    return json(400, { ok: false, error: "bad_metrics" });
  }
  if (bucketSec !== BUCKET_SEC) {
    return json(400, { ok: false, error: "bad_bucketSec" });
  }

  // Time sanity check: allow ±1 hour
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(bucketStart - nowSec) > 3600) {
    return json(400, { ok: false, error: "bucketStart_out_of_range" });
  }

  // Convert epoch -> timestamptz
  const bucketIso = new Date(bucketStart * 1000).toISOString();

  // UPSERT (dedupe on PK)
  try {
    await sql`
      insert into telemetry_points (device_id, bucket_start, bucket_sec, metrics)
      values (${deviceId}, ${bucketIso}::timestamptz, ${BUCKET_SEC}, ${JSON.stringify(metrics)}::jsonb)
      on conflict (device_id, bucket_start)
      do update set
        metrics = excluded.metrics,
        bucket_sec = excluded.bucket_sec,
        ingested_at = now()
    `;
  } catch (e) {
    return json(500, { ok: false, error: "db_insert_failed" });
  }

  return json(200, { ok: true });
}
