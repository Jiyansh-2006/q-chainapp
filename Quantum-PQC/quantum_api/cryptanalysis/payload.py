# cryptanalysis/payload.py
import json
import hashlib

def canonical_payload_hash(tx: dict) -> str:
    """
    Generates canonical hash for transaction binding
    """
    canonical = json.dumps(tx, sort_keys=True)
    return hashlib.sha3_256(canonical.encode()).hexdigest()
