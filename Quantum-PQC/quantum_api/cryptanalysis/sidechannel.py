import time, random

def timing_leak_score(tx) -> float:
    base = len(str(tx)) / 1000
    jitter = random.uniform(0.0, 0.4)
    return min(1.0, base + jitter)

def normalize_response_delay(min_delay=0.05, max_delay=0.12):
    time.sleep(random.uniform(min_delay, max_delay))
