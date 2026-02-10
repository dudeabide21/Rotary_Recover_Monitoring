import time
import math
import random
import argparse
import requests
from collections import deque

# --------- MATCH ESP/NOTEBOOK SETTINGS ----------
BUCKET_SEC = 5
SAMPLE_HZ = 100  # match ESP SAMPLE_MS=10 => 100Hz

SMOOTH_WIN = 7
START_THR = 0.22
STOP_THR  = 0.09
MIN_REST_S = 0.15
MIN_REP_DUR_S = 0.35
START_CONFIRM_S = 0.08
COOLDOWN_S = 0.10
# -----------------------------------------------

def aligned_bucket(epoch: int) -> int:
    return (epoch // BUCKET_SEC) * BUCKET_SEC

def norm3(x, y, z) -> float:
    return (x*x + y*y + z*z) ** 0.5

class MovingAvg:
    def __init__(self, win: int):
        self.win = max(1, int(win))
        self.buf = deque(maxlen=self.win)
        self.sum = 0.0

    def update(self, x: float) -> float:
        if self.win == 1:
            return x
        if len(self.buf) == self.buf.maxlen:
            self.sum -= self.buf[0]
        self.buf.append(x)
        self.sum += x
        return self.sum / len(self.buf)

class RepFSM:
    IDLE = 0
    IN_REP = 1

    def __init__(self):
        self.state = self.IDLE
        self.rep_total = 0
        self.rep_active = 0

        self.above_start_time = 0.0
        self.below_stop_time = 0.0
        self.cooldown_until = -1e9

        self.rep_start_t = None
        self.rom_rad = 0.0

        self.last_t = None
        self.last_dw_raw = None

        # last rep outputs
        self.rom_last_deg = 0.0
        self.rep_dur_last_s = 0.0

    def update(self, t_s: float, dw_raw: float, dw_s: float):
        if self.last_t is None:
            self.last_t = t_s
            self.last_dw_raw = dw_raw
            return

        dt = t_s - self.last_t
        if dt <= 0 or dt > 0.2:
            self.last_t = t_s
            self.last_dw_raw = dw_raw
            return

        if self.state == self.IDLE:
            self.rep_active = 0

            if t_s < self.cooldown_until:
                self.above_start_time = 0.0
            else:
                if dw_s >= START_THR:
                    self.above_start_time += dt
                else:
                    self.above_start_time = 0.0

                if self.above_start_time >= START_CONFIRM_S:
                    self.state = self.IN_REP
                    self.rep_active = 1
                    self.rep_start_t = t_s
                    self.rep_total += 1

                    self.rom_rad = 0.0
                    self.below_stop_time = 0.0

        else:  # IN_REP
            self.rep_active = 1

            # trapezoid integration of |dw_raw|
            self.rom_rad += 0.5 * (self.last_dw_raw + dw_raw) * dt

            if dw_s <= STOP_THR:
                self.below_stop_time += dt
            else:
                self.below_stop_time = 0.0

            if self.below_stop_time >= MIN_REST_S:
                rep_dur = t_s - (self.rep_start_t if self.rep_start_t is not None else t_s)
                rom_deg = self.rom_rad * (180.0 / math.pi)

                if rep_dur >= MIN_REP_DUR_S:
                    self.rom_last_deg = rom_deg
                    self.rep_dur_last_s = rep_dur

                # return to idle + cooldown
                self.state = self.IDLE
                self.rep_active = 0
                self.rep_start_t = None
                self.above_start_time = 0.0
                self.cooldown_until = t_s + COOLDOWN_S
                self.rom_rad = 0.0
                self.below_stop_time = 0.0

        self.last_t = t_s
        self.last_dw_raw = dw_raw

def generate_gyro_pair(phase: float):
    """
    Generate two gyro vectors (rad/s).
    We deliberately create bursts so the FSM can detect reps.
    """
    # Base movement pattern
    base = 0.12 + 0.10 * (0.5 + 0.5 * math.sin(phase * 0.6))

    # Create "rep bursts" every few seconds
    burst = 0.0
    burst_window = math.sin(phase * 0.25)  # slow gate
    if burst_window > 0.6:
        burst = 0.35 + 0.25 * (0.5 + 0.5 * math.sin(phase * 1.7))

    # Sensor 1
    g1x = (base + burst) * math.sin(phase) + random.uniform(-0.01, 0.01)
    g1y = (base + 0.6 * burst) * math.cos(phase * 0.9) + random.uniform(-0.01, 0.01)
    g1z = 0.08 * math.sin(phase * 0.4) + 0.25 * burst + random.uniform(-0.01, 0.01)

    # Sensor 2 slightly different phase/amplitude
    g2x = (base + 0.85 * burst) * math.sin(phase + 0.12) + random.uniform(-0.01, 0.01)
    g2y = (base + 0.55 * burst) * math.cos(phase * 0.9 + 0.18) + random.uniform(-0.01, 0.01)
    g2z = 0.08 * math.sin(phase * 0.4 + 0.1) + 0.20 * burst + random.uniform(-0.01, 0.01)

    return (g1x, g1y, g1z), (g2x, g2y, g2z)

def main():
    parser = argparse.ArgumentParser(description="Dual-MPU FSM telemetry simulator")
    parser.add_argument("--url", default="http://localhost:3000/api/ingest", help="Ingest endpoint")
    parser.add_argument("--token", required=True, help="DEVICE_TOKEN")
    parser.add_argument("--device", default="esp8266-01", help="deviceId")
    parser.add_argument("--minutes", type=int, default=10, help="how long to run (minutes)")
    args = parser.parse_args()

    headers = {
        "Authorization": f"Bearer {args.token}",
        "Content-Type": "application/json",
    }

    smoother = MovingAvg(SMOOTH_WIN)
    fsm = RepFSM()

    dt = 1.0 / SAMPLE_HZ
    samples_per_bucket = BUCKET_SEC * SAMPLE_HZ

    end_time = time.time() + args.minutes * 60
    phase = 0.0

    print(f"Posting to: {args.url}")
    print(f"Device: {args.device}")
    print(f"Rate: {SAMPLE_HZ} Hz, bucket: {BUCKET_SEC}s")
    print("Ctrl+C to stop.\n")

    i = 0
    while time.time() < end_time:
        i += 1
        bucket_start = aligned_bucket(int(time.time()))

        # Bucket accumulators
        sum_dw = 0.0
        max_dw = 0.0
        sum_dw_s = 0.0
        sum_g1_mag = 0.0
        sum_g2_mag = 0.0
        sum_dom = 0.0

        # Run high-rate samples for BUCKET_SEC seconds
        t0 = time.perf_counter()
        for _ in range(samples_per_bucket):
            phase += 0.08

            (g1x, g1y, g1z), (g2x, g2y, g2z) = generate_gyro_pair(phase)

            g1_mag = norm3(g1x, g1y, g1z)
            g2_mag = norm3(g2x, g2y, g2z)
            dom = g1_mag - g2_mag

            dw_raw = norm3(g1x - g2x, g1y - g2y, g1z - g2z)
            dw_sm = smoother.update(dw_raw)

            # feed FSM with local time axis like firmware (seconds since start)
            t_s = time.perf_counter()
            fsm.update(t_s, dw_raw, dw_sm)

            sum_dw += dw_raw
            max_dw = max(max_dw, dw_raw)
            sum_dw_s += dw_sm
            sum_g1_mag += g1_mag
            sum_g2_mag += g2_mag
            sum_dom += dom

            time.sleep(dt)

        # Average bucket
        n = float(samples_per_bucket)
        metrics = {
            "dw_mag_avg": round(sum_dw / n, 6),
            "dw_mag_max": round(max_dw, 6),
            "dw_s_avg": round(sum_dw_s / n, 6),

            "rep_total": int(fsm.rep_total),
            "rep_active": int(fsm.rep_active),
            "rom_proxy_deg_last": round(float(fsm.rom_last_deg), 3),
            "rep_dur_last_s": round(float(fsm.rep_dur_last_s), 3),

            "g1_mag_avg": round(sum_g1_mag / n, 6),
            "g2_mag_avg": round(sum_g2_mag / n, 6),
            "dom_avg": round(sum_dom / n, 6),
        }

        payload = {
            "deviceId": args.device,
            "bucketStart": int(bucket_start),
            "bucketSec": 5,
            "metrics": metrics
        }

        try:
            r = requests.post(args.url, headers=headers, json=payload, timeout=10)
            ok = (r.status_code == 200)
            print(
                f"[{i:04d}] bucket={bucket_start} HTTP={r.status_code} "
                f"rep={metrics['rep_total']} active={metrics['rep_active']} "
                f"dw_s_avg={metrics['dw_s_avg']:.3f} rom_last={metrics['rom_proxy_deg_last']:.1f}"
                + ("" if ok else f"  body={r.text[:120]}")
            )
        except Exception as e:
            print(f"[{i:04d}] ERROR posting bucket: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
