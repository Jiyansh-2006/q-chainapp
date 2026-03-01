import hashlib, json

_seen = set()

def detect_replay(tx, signature) -> bool:
    key = hashlib.sha256(
        (json.dumps(tx, sort_keys=True) + signature).encode()
    ).hexdigest()

    if key in _seen:
        return True

    _seen.add(key)
    return False
