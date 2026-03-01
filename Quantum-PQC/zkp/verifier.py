import json
import subprocess
import tempfile
import os

BASE_DIR = os.path.dirname(__file__)

def verify_snark(proof: dict, public_signals: list) -> bool:
    with tempfile.TemporaryDirectory() as tmp:
        proof_path = os.path.join(tmp, "proof.json")
        pub_path = os.path.join(tmp, "public.json")

        with open(proof_path, "w") as f:
            json.dump(proof, f)

        with open(pub_path, "w") as f:
            json.dump(public_signals, f)

        result = subprocess.run(
            [
                "snarkjs",
                "groth16",
                "verify",
                os.path.join(BASE_DIR, "verification_key.json"),
                pub_path,
                proof_path,
            ],
            capture_output=True,
            text=True,
        )

        return "OK" in result.stdout
