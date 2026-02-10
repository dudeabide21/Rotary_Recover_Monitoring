import time
import math
import random
import argparse
import requests

def aligned_bucket_start(epoch_seconds: int, bucket_sec: int) -> int:
    return (epoch_seconds // bucket_sec) * bucket_sec

def main():
    parser = argparse.ArgumentParser(description="ESP8266 telemetry simulator")
    parser.add_argument("--url", default="http://localhost:3000/api/ingest", help="Ingest endpoint URL")
    parser.add_argument("--token", required=True, help="DEVICE_TOKEN (Bearer token)")
    parser.add_argument("--device", default="esp8266-01", help="deviceId")
    parser.add_argument("--bucket", type=int, default=5, help="bucketSec (must be 5 to match API)")
    parser.add_argument("--count", type=int, default=200, help="how many points to send")
    args = parser.parse_args()

    url = args.url
    token = args.token
    device_id = args.device
    bucket_sec = args.bucket

    if bucket_sec != 5:
        raise SystemExit("bucketSec must be 5 to match the server validation")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # starting "state"
    reps_total = 0
    base_rom = 70.0
    base_smooth = 0.80

    print(f"Sending to: {url}")
    print(f"Device: {device_id}, every {bucket_sec}s, points: {args.count}")

    for i in range(args.count):
        now = int(time.time())
        bucket_start = aligned_bucket_start(now, bucket_sec)

        # Make values move realistically:
        # - ROM varies with a slow sine wave + noise
        # - Smoothness drifts slightly
        t = i / 10.0
        knee_rom_avg = base_rom + 8.0 * math.sin(t) + random.uniform(-1.2, 1.2)
        knee_rom_max = knee_rom_avg + random.uniform(2.0, 6.0)
        smoothness_avg = min(0.99, max(0.55, base_smooth + 0.08 * math.sin(t / 2.0) + random.uniform(-0.03, 0.03)))

        # Fake reps: occasionally increment by 1
        rep_delta = 1 if random.random() < 0.35 else 0
        reps_total += rep_delta

        payload = {
            "deviceId": device_id,
            "bucketStart": bucket_start,
            "bucketSec": 5,
            "metrics": {
                "knee_rom_avg": round(knee_rom_avg, 3),
                "knee_rom_max": round(knee_rom_max, 3),
                "smoothness_avg": round(smoothness_avg, 3),
                "rep_count_delta": rep_delta,
                "rep_total": reps_total
            }
        }

        try:
            r = requests.post(url, headers=headers, json=payload, timeout=8)
            ok = (r.status_code == 200)
            print(f"[{i+1:03d}] {bucket_start} -> {r.status_code} {'OK' if ok else r.text[:120]}")
        except requests.RequestException as e:
            print(f"[{i+1:03d}] ERROR: {e}")

        # Wait until the next 5s boundary (stable cadence)
        # This keeps buckets consistent even if POST takes time.
        time.sleep(bucket_sec)

if __name__ == "__main__":
    main()
