# cryptanalysis/analyzer.py

from typing import Dict, Any
import hashlib, json

from ..cryptanalysis.replay import detect_replay
from ..cryptanalysis.sidechannel import timing_leak_score
from ..cryptanalysis.zkp_layer import verify_zkp_attributes


def analyze_transaction(
    tx: Dict[str, Any],
    signature: str,
    algorithm: str,
    zkp: Dict[str, Any] | None
) -> Dict[str, Any]:

    issues = []
    secure = True
    risk = "low"

    # 1️⃣ Replay detection (ALWAYS critical)
    if detect_replay(tx, signature):
        issues.append("Replay attack detected")
        secure = False
        risk = "high"

    # 2️⃣ Message entropy (HEX-aware + blockchain-aware)
    msg_hash = hashlib.sha256(
        json.dumps(tx, sort_keys=True).encode()
    ).hexdigest()

    # entropy normalized to hex alphabet (16 symbols)
    entropy = len(set(msg_hash)) / 16.0

    if entropy < 0.15:
        issues.append("Very low message entropy")
        secure = False
        risk = "high"

    elif entropy < 0.35:
        issues.append("Low message entropy")
        risk = "medium"   # ⚠️ DO NOT BLOCK

    # 3️⃣ Timing side-channel
    timing = timing_leak_score(tx)

    if timing > 0.85:
        issues.append("High timing side-channel risk")
        secure = False
        risk = "high"

    elif timing > 0.45:
        issues.append("Moderate timing side-channel risk")
        if risk != "high":
            risk = "medium"

    # 4️⃣ ZKP attribute verification
    if zkp is not None:
        zkp_ok, zkp_issue = verify_zkp_attributes(tx, zkp)
        if not zkp_ok:
            issues.append(zkp_issue)
            secure = False
            risk = "high"

    return {
        "secure": secure,
        "risk": risk,
        "issues": issues,
        "metrics": {
            "entropy": round(entropy, 3),
            "timing_leak_score": round(timing, 3)
        }
    }
