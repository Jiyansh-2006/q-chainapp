# cryptanalysis/fraud_mapper.py

def map_to_fraud_alert(analysis: dict) -> dict:
    risk = analysis.get("risk", "low")
    entropy = analysis["metrics"].get("entropy", 1)
    timing = analysis["metrics"].get("timing_leak_score", 0)

    if risk == "high":
        return {
            "fraud": True,
            "probability": 0.85,
            "severity": "High",
            "reason": ", ".join(analysis["issues"])
        }

    if risk == "medium":
        return {
            "fraud": True,
            "probability": 0.55,
            "severity": "Medium",
            "reason": "Suspicious entropy or timing pattern"
        }

    return {
        "fraud": False,
        "probability": 0.1,
        "severity": "Low",
        "reason": "Transaction appears normal"
    }
