def verify_zkp_attributes(tx: dict, zkp: dict):
    """
    Validate ZKP attributes based on frontend structure.
    Expected structure:

    {
        "enable": true,
        "attributes": [...],
        "public_inputs": {...}
    }
    """

    if not zkp or not zkp.get("enable", False):
        return True, ""

    attributes = zkp.get("attributes", [])
    public_inputs = zkp.get("public_inputs", {})

    # Required security attributes
    required = ["amount_gt_zero"]

    for field in required:
        if field not in attributes:
            return False, f"Missing ZKP attribute: {field}"

        if field not in public_inputs:
            return False, f"Missing ZKP public input: {field}"

    # Logical validation
    if public_inputs.get("amount_gt_zero") != (tx.get("amount", 0) > 0):
        return False, "ZKP verification failed: amount_gt_zero mismatch"

    # Optional checks
    if "nonce" in attributes:
        if public_inputs.get("nonce") != tx.get("nonce"):
            return False, "ZKP verification failed: nonce mismatch"

    if "recipient" in attributes:
        if public_inputs.get("recipient") != tx.get("to"):
            return False, "ZKP verification failed: recipient mismatch"

    return True, ""
