# fraud_api.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uvicorn

# Initialize FastAPI app
app = FastAPI(title="Fraud Detection API", version="2.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# MODELS
# -------------------------------

class TransactionRequest(BaseModel):
    amount: float
    timestamp: str
    recipient_address: str
    sender_address: Optional[str] = "wallet_1000"
    fee: Optional[float] = 0.0025


class FraudResponse(BaseModel):
    risk_level: str        # "low", "medium", "high"
    risk_score: float      # 0.0 to 1.0
    probability: float     # alias for frontend
    severity: str          # "Low", "Medium", "High"
    reason: str
    recommendations: list[str]
    timestamp: str
    status: str


# -------------------------------
# FRAUD LOGIC CONFIG
# -------------------------------

AMOUNT_THRESHOLDS = {
    "low_1": 50,
    "low_2": 200,
    "low_3": 500,
    "medium_1": 1000,
    "medium_2": 2000
}

SUSPICIOUS_HOURS = [1, 2, 3, 4, 22, 23]

AVERAGE_FEE = 0.0025


# -------------------------------
# ENDPOINTS
# -------------------------------

@app.get("/")
async def root():
    return {
        "service": "Fraud Detection API",
        "version": "2.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    response = JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "timestamp": datetime.now().isoformat()
        }
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.post("/predict-fraud", response_model=FraudResponse)
async def predict_fraud(transaction: TransactionRequest):
    try:
        # Parse timestamp safely
        try:
            tx_time = datetime.strptime(transaction.timestamp, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            tx_time = datetime.fromisoformat(transaction.timestamp)

        hour = tx_time.hour
        amount = transaction.amount

        risk_score = 0.0
        reasons = []

        # --------------------------------
        # 1️⃣ AMOUNT-BASED RISK (Primary)
        # --------------------------------

        if amount <= AMOUNT_THRESHOLDS["low_1"]:
            risk_score += 0.05

        elif amount <= AMOUNT_THRESHOLDS["low_2"]:
            risk_score += 0.15

        elif amount <= AMOUNT_THRESHOLDS["low_3"]:
            risk_score += 0.30

        elif amount <= AMOUNT_THRESHOLDS["medium_1"]:
            risk_score += 0.50
            reasons.append("Large transaction amount")

        elif amount <= AMOUNT_THRESHOLDS["medium_2"]:
            risk_score += 0.70
            reasons.append("Very large transaction amount")

        else:
            risk_score += 0.85
            reasons.append("Extremely large transaction amount")

        # --------------------------------
        # 2️⃣ TIME-BASED RISK (Minor weight)
        # --------------------------------

        if hour in SUSPICIOUS_HOURS:
            risk_score += 0.05
            reasons.append(f"Suspicious transaction hour: {hour}:00")

        # --------------------------------
        # 3️⃣ FEE ANOMALY
        # --------------------------------

        if transaction.fee:
            fee_ratio = transaction.fee / AVERAGE_FEE

            if fee_ratio < 0.2 or fee_ratio > 5:
                risk_score += 0.05
                reasons.append("Unusual transaction fee")

        # --------------------------------
        # Cap risk score
        # --------------------------------

        risk_score = min(risk_score, 1.0)

        # --------------------------------
        # DETERMINE LEVEL
        # --------------------------------

        if risk_score > 0.70:
            risk_level = "high"
            severity = "High"
            recommendations = [
                "Require additional confirmation",
                "Display warning to user",
                "Log for review"
            ]

        elif risk_score > 0.40:
            risk_level = "medium"
            severity = "Medium"
            recommendations = [
                "Request user confirmation",
                "Monitor similar transactions"
            ]

        else:
            risk_level = "low"
            severity = "Low"
            recommendations = [
                "Proceed normally"
            ]

        response = FraudResponse(
            risk_level=risk_level,
            risk_score=round(risk_score, 2),
            probability=round(risk_score, 2),   # frontend compatibility
            severity=severity,                  # frontend compatibility
            reason="; ".join(reasons) if reasons else "Normal transaction pattern",
            recommendations=recommendations,
            timestamp=transaction.timestamp,
            status="success"
        )
        
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------
# TEST ENDPOINTS
# -------------------------------

@app.get("/test-low")
async def test_low():
    return await predict_fraud(TransactionRequest(
        amount=25,
        timestamp="2024-01-12 14:30:00",
        recipient_address="0xabc",
        fee=0.0025
    ))


@app.get("/test-medium")
async def test_medium():
    return await predict_fraud(TransactionRequest(
        amount=1200,
        timestamp="2024-01-12 14:30:00",
        recipient_address="0xabc",
        fee=0.0025
    ))


@app.get("/test-high")
async def test_high():
    return await predict_fraud(TransactionRequest(
        amount=3500,
        timestamp="2024-01-12 02:30:00",
        recipient_address="0xabc",
        fee=0.0001
    ))


# -------------------------------
# RUN SERVER
# -------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)