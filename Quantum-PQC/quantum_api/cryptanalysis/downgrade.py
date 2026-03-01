# cryptanalysis/downgrade.py

# Tracks if a sender ever used PQC
PQC_HISTORY = {}

def detect_downgrade(sender: str, is_pqc: bool) -> bool:
    """
    Detects downgrade from PQC → non-PQC
    """
    previously_used_pqc = PQC_HISTORY.get(sender, False)

    if previously_used_pqc and not is_pqc:
        return True

    if is_pqc:
        PQC_HISTORY[sender] = True

    return False
