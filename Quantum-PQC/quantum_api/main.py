# ============================================================
# QCHAIN PQC + ZKP API (AI Microservice Integrated)
# ============================================================

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import json
import time
import hashlib
import oqs
import base64
import os
import random
import requests

# ============================================================
# Initialize App
# ============================================================

app = FastAPI(
    title="QChain PQC + ZKP API",
    version="4.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Global State
# ============================================================

pqc_wallets: Dict[str, Dict[str, Any]] = {}
wallet_security_mode: Dict[str, bool] = {}

AI_SERVICE_URL = os.environ.get(
    "AI_SERVICE_URL",
    "https://qchain-ai-backend.onrender.com/predict-fraud-real-time"
)

PQC_ALGO = "ML-DSA-44"  # ✅ NIST standardized Dilithium2

# ============================================================
# Models
# ============================================================

class Transaction(BaseModel):
    amount: float = Field(..., gt=0)
    to: str
    nonce: int
    timestamp: str


class SignRequest(BaseModel):
    wallet_id: str
    transaction: Transaction
    algorithm: str = "pqc"
    zkp: Optional[Dict[str, Any]] = None


# ============================================================
# Helpers
# ============================================================

def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ")


def canonical(tx: Transaction) -> bytes:
    return json.dumps(
        tx.dict(),
        sort_keys=True,
        separators=(",", ":")
    ).encode()


def detect_downgrade(wallet_id: str, is_pqc: bool):
    previous = wallet_security_mode.get(wallet_id)
    if previous is True and not is_pqc:
        return True
    wallet_security_mode[wallet_id] = is_pqc
    return False


# ============================================================
# AI Risk Integration
# ============================================================

def get_ai_risk(tx_dict):
    try:
        response = requests.post(
            AI_SERVICE_URL,
            json={
                "amount": tx_dict["amount"],
                "sender_wallet": "pqc_wallet",
                "receiver_wallet": tx_dict["to"],
                "timestamp": tx_dict["timestamp"]
            },
            timeout=3
        )

        if response.status_code == 200:
            data = response.json()
            return int(data.get("risk_score", 10))

        return 10

    except Exception:
        return 10


def generate_analysis(tx_dict, algorithm):

    entropy_score = random.uniform(0.88, 0.99)
    timing_leak_score = random.uniform(0.01, 0.08)

    ai_risk = get_ai_risk(tx_dict)
    risk_score = ai_risk

    if timing_leak_score > 0.06:
        risk_score += 10

    if entropy_score < 0.9:
        risk_score += 10

    if tx_dict["amount"] > 5_000_000:
        risk_score = 95

    risk_score = min(risk_score, 95)

    if risk_score > 70:
        risk = "high"
    elif risk_score > 40:
        risk = "medium"
    else:
        risk = "low"

    return {
        "secure": risk != "high",
        "risk": risk,
        "risk_score": risk_score
    }


# ============================================================
# Routes
# ============================================================

@app.get("/")
async def root():
    return {
        "service": "QChain PQC API",
        "version": "4.0.1",
        "timestamp": now_iso()
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "wallets": len(pqc_wallets),
        "timestamp": now_iso()
    }


@app.post("/sign", status_code=status.HTTP_201_CREATED)
async def sign_transaction(request: SignRequest):

    wallet_id = request.wallet_id
    message = canonical(request.transaction)

    # ---------------- PQC SIGNING ----------------
    if request.algorithm.lower() == "pqc":

        if detect_downgrade(wallet_id, True):
            raise HTTPException(status_code=400, detail="Security downgrade detected")

        if wallet_id not in pqc_wallets:
            signer = oqs.Signature(PQC_ALGO)
            public_key = signer.generate_keypair()
            pqc_wallets[wallet_id] = {
                "signer": signer,
                "public_key": public_key
            }

        signer = pqc_wallets[wallet_id]["signer"]
        signature = signer.sign(message).hex()
        algo_name = PQC_ALGO

    # ---------------- ECDSA SIMULATION ----------------
    else:
        signature = hashlib.sha256(message).hexdigest()
        algo_name = "ECDSA-SHA256"

    analysis = generate_analysis(request.transaction.dict(), algo_name)

    if analysis["risk"] == "high":
        raise HTTPException(status_code=400, detail=analysis)

    return {
        "status": "success",
        "signature": signature,
        "algorithm": algo_name,
        "transaction_hash": hashlib.sha256(message).hexdigest(),
        "analysis": analysis,
        "timestamp": now_iso(),
        "wallet_id": wallet_id
    }


@app.post("/verify")
async def verify_signature(
    wallet_id: str,
    transaction: Transaction,
    signature: str,
    algorithm: str
):

    message = canonical(transaction)

    if algorithm == PQC_ALGO:
        if wallet_id not in pqc_wallets:
            raise HTTPException(status_code=404, detail="Wallet not found")

        verifier = oqs.Signature(PQC_ALGO)
        signature_bytes = bytes.fromhex(signature)

        verified = verifier.verify(
            message,
            signature_bytes,
            pqc_wallets[wallet_id]["public_key"]
        )
    else:
        expected = hashlib.sha256(message).hexdigest()
        verified = signature == expected

    return {
        "verified": verified,
        "timestamp": now_iso()
    }

# ============================================================
# Quantum Hash Route
# ============================================================

from pydantic import BaseModel

class HashRequest(BaseModel):
    image_data: str
    name: str
    description: str


@app.post("/generate-hash")
async def generate_hash(request: HashRequest):

    try:
        # Combine NFT data deterministically
        combined = f"{request.name}|{request.description}|{request.image_data}"

        # Use SHA3-256 (quantum-safe hash)
        quantum_hash = hashlib.sha3_256(combined.encode()).hexdigest()

        return {
            "status": "success",
            "quantum_hash": quantum_hash,
            "timestamp": now_iso()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/debug-oqs")
async def debug_oqs():
    return {
        "enabled_signatures": oqs.get_enabled_sig_mechanisms()
    }


# ============================================================
# Run Server
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


