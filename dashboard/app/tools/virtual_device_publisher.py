import time
import math
import requests
import serial
from collections import deque
import numpy as np

# ================= CONFIG =================
PORT = "COM20"         # adjust
BAUD = 115200

INGEST_URL = "https://YOUR_DOMAIN.vercel.app/api/ingest"
DEVICE_TOKEN = "YOUR_DEVICE_TOKEN"
DEVICE_ID = "laptop-rt-imu"

BUCKET_SEC = 2
EXPECTED_COLS = 14

SMOOTH_WIN = 7
START_THR = 0.14
STOP_THR  = 0.08
MIN_REST_S = 0.15
MIN_REP_DUR_S = 0.35
START_CONFIRM_S = 0.05
COOLDOWN_S = 0.10
# ==========================================

def aligned_bucket(epoch):
    return (epoch // BUCKET_SEC) * BUCKET_SEC

def post_bucket(bucket_start, metrics):
    body = {
        "deviceId": DEVICE_ID,
        "bucketStart": int(bucket_start),
        "bucketSec": BUCKET_SEC,
        "metrics": metrics
    }

    r = requests.post(
        INGEST_URL,
        json=body,
        headers={
            "Authorization": f"Bearer {DEVICE_TOKEN}",
            "Content-Type": "application/json"
        },
        timeout=5
    )
    return r.status_code

def norm3(x,y,z):
    return math.sqrt(x*x+y*y+z*z)

class MovingAvg:
    def __init__(self, win):
        self.buf = deque(maxlen=win)
        self.sum = 0

    def update(self, x):
        if len(self.buf)==self.buf.maxlen:
            self.sum -= self.buf[0]
        self.buf.append(x)
        self.sum += x
        return self.sum/len(self.buf)

class RepFSM:
    IDLE=0
    IN_REP=1
    def __init__(self):
        self.state=self.IDLE
        self.rep_total=0
        self.rep_active=0
        self.rom_rad=0
        self.last_t=None
        self.last_dw=None
        self.rep_start=None
        self.above_start=0
        self.below_stop=0
        self.cooldown=0
        self.rom_last=0
        self.rep_dur_last=0

    def update(self,t,dw,dws):
        if self.last_t is None:
            self.last_t=t
            self.last_dw=dw
            return

        dt=t-self.last_t

        if self.state==self.IDLE:
            self.rep_active=0
            if t>=self.cooldown:
                if dws>=START_THR:
                    self.above_start+=dt
                else:
                    self.above_start=0

                if self.above_start>=START_CONFIRM_S:
                    self.state=self.IN_REP
                    self.rep_active=1
                    self.rep_total+=1
                    self.rep_start=t
                    self.rom_rad=0
                    self.below_stop=0

        else:
            self.rep_active=1
            self.rom_rad+=0.5*(self.last_dw+dw)*dt

            if dws<=STOP_THR:
                self.below_stop+=dt
            else:
                self.below_stop=0

            if self.below_stop>=MIN_REST_S:
                dur=t-self.rep_start
                if dur>=MIN_REP_DUR_S:
                    self.rom_last=self.rom_rad*(180/math.pi)
                    self.rep_dur_last=dur

                self.state=self.IDLE
                self.rep_active=0
                self.cooldown=t+COOLDOWN_S
                self.above_start=0
                self.rom_rad=0

        self.last_t=t
        self.last_dw=dw

def parse_line(line):
    parts=line.split(",")
    if len(parts)!=EXPECTED_COLS:
        return None
    try:
        t_us=int(parts[1])
        g1x=float(parts[5]);g1y=float(parts[6]);g1z=float(parts[7])
        g2x=float(parts[11]);g2y=float(parts[12]);g2z=float(parts[13])
        return t_us/1e6,g1x,g1y,g1z,g2x,g2y,g2z
    except:
        return None

def main():
    ser=serial.Serial(PORT,BAUD,timeout=1)
    time.sleep(2)
    ser.reset_input_buffer()

    smoother=MovingAvg(SMOOTH_WIN)
    fsm=RepFSM()

    bucket_start=None
    sum_dw=0
    sum_dws=0
    max_dw=0
    n=0

    while True:
        line=ser.readline().decode(errors="ignore").strip()
        if not line or "SEQ" in line:
            continue

        parsed=parse_line(line)
        if not parsed:
            continue

        t,g1x,g1y,g1z,g2x,g2y,g2z=parsed

        dw=norm3(g1x-g2x,g1y-g2y,g1z-g2z)
        dws=smoother.update(dw)
        fsm.update(t,dw,dws)

        now=int(time.time())
        b=aligned_bucket(now)
        if bucket_start is None:
            bucket_start=b

        if b!=bucket_start and n>0:
            metrics={
                "dw_mag_avg":sum_dw/n,
                "dw_mag_max":max_dw,
                "dw_s_avg":sum_dws/n,
                "rep_total":fsm.rep_total,
                "rep_active":fsm.rep_active,
                "rom_proxy_deg_last":fsm.rom_last,
                "rep_dur_last_s":fsm.rep_dur_last
            }
            code=post_bucket(bucket_start,metrics)
            print("POST",bucket_start,"HTTP",code,"rep",fsm.rep_total,"rom",fsm.rom_last)

            bucket_start=b
            sum_dw=sum_dws=0
            max_dw=0
            n=0

        sum_dw+=dw
        sum_dws+=dws
        max_dw=max(max_dw,dw)
        n+=1

if __name__=="__main__":
    main()
