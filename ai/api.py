# qchain/ai/api.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import json
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import traceback
import os

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Q-Chain Fraud Detection API", 
    description="Real-time fraud detection for QToken transactions",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "model", "features.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

# Load model with fallback
model = None
features = []
scaler = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        logger.info("✅ Model loaded successfully")
    else:
        logger.warning(f"⚠️ Model not found at {MODEL_PATH}, using deterministic fallback")
except Exception as e:
    logger.error(f"❌ Error loading model: {e}")

try:
    if os.path.exists(FEATURES_PATH):
        features = joblib.load(FEATURES_PATH)
        logger.info(f"📊 Features loaded: {features}")
except Exception as e:
    logger.error(f"❌ Error loading features: {e}")

try:
    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        logger.info("✅ Scaler loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading scaler: {e}")

# In-memory storage
sender_history: Dict[str, List[Dict]] = {}
active_connections: List[WebSocket] = []

class Transaction(BaseModel):
    amount: float
    fee: Optional[float] = 0.001
    sender_wallet: str
    receiver_wallet: str
    timestamp: str
    transaction_type: str = "transfer"
    tx_hash: Optional[str] = None

class FraudPrediction(BaseModel):
    fraud: bool
    probability: float
    severity: str
    reason: str
    features_used: List[str]
    model_version: str = "1.0.0"
    risk_score: Optional[float] = None
    analysis_details: Optional[Dict[str, Any]] = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total: {len(self.active_connections)}")
        
    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")
        
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

def calculate_probabilistic_risk(amount: float, sender_tx_count: int = 0, avg_amount: float = 0) -> Dict[str, Any]:
    """
    Calculate probabilistic risk score based on transaction amount and history
    Returns: (probability, severity, reason, analysis_details)
    """
    
    # Base probability from amount (logistic function for smooth transition)
    # This creates a smooth S-curve instead of sharp threshold
    amount_factor = 1 / (1 + np.exp(-0.8 * (amount - 4)))  # Sigmoid centered at 4
    
    # Add some randomness for probabilistic behavior (±10% variation)
    random_factor = 0.9 + (np.random.random() * 0.2)  # 0.9 to 1.1
    
    # Velocity factor (more transactions = slightly higher risk)
    velocity_factor = min(1.0, sender_tx_count / 20) * 0.2
    
    # Anomaly factor (if amount is far from average)
    anomaly_factor = 0
    if avg_amount > 0:
        ratio = amount / avg_amount
        if ratio > 3:
            anomaly_factor = 0.3
        elif ratio > 2:
            anomaly_factor = 0.2
        elif ratio > 1.5:
            anomaly_factor = 0.1
    
    # Calculate final probability (capped between 0.05 and 0.98)
    raw_probability = (amount_factor * random_factor) + velocity_factor + anomaly_factor
    probability = min(0.98, max(0.05, raw_probability))
    
    # Determine severity based on probability
    if probability < 0.3:
        severity = "Low"
    elif probability < 0.6:
        severity = "Medium"
    else:
        severity = "High"
    
    # Generate detailed reason
    reasons = []
    if amount > 6:
        reasons.append(f"Amount {amount:.2f} QTOK exceeds maximum limit")
    elif amount > 4:
        reasons.append(f"Amount {amount:.2f} QTOK exceeds risk threshold")
    
    if anomaly_factor > 0:
        reasons.append(f"Amount is {ratio:.1f}x above average")
    
    if velocity_factor > 0.1:
        reasons.append(f"High transaction frequency ({sender_tx_count} recent tx)")
    
    if not reasons:
        if probability < 0.3:
            reasons.append("Transaction appears normal")
        elif probability < 0.6:
            reasons.append("Moderate risk factors detected")
        else:
            reasons.append("Multiple suspicious patterns detected")
    
    reason = " | ".join(reasons)
    
    # Analysis details
    analysis_details = {
        "amount_factor": float(amount_factor),
        "random_factor": float(random_factor),
        "velocity_factor": float(velocity_factor),
        "anomaly_factor": float(anomaly_factor),
        "raw_probability": float(raw_probability),
        "amount": amount,
        "threshold_4": amount > 4,
        "threshold_6": amount > 6,
        "sender_tx_count": sender_tx_count
    }
    
    return {
        "probability": float(probability),
        "severity": severity,
        "reason": reason,
        "analysis_details": analysis_details
    }

def extract_features_from_transaction(tx: Transaction) -> pd.DataFrame:
    """Extract features from transaction data"""
    try:
        data = {
            "amount": [tx.amount],
            "fee": [tx.fee or 0.001],
            "sender_wallet": [tx.sender_wallet],
            "receiver_wallet": [tx.receiver_wallet],
            "timestamp": [tx.timestamp],
            "transaction_type": [tx.transaction_type]
        }
        
        df = pd.DataFrame(data)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        
        # Time-based features
        df["hour"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        df["is_weekend"] = df["day_of_week"].isin([5,6]).astype(int)
        df["log_amount"] = np.log1p(df["amount"])
        df["log_fee"] = np.log1p(df["fee"] + 1e-6)
        
        # Trigonometric time features
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"]/24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"]/24)
        df["day_sin"] = np.sin(2 * np.pi * df["day_of_week"]/7)
        df["day_cos"] = np.cos(2 * np.pi * df["day_of_week"]/7)
        
        # Sender history features
        sender_tx = sender_history.get(tx.sender_wallet, [])
        df["sender_tx_count"] = len(sender_tx) + 1
        
        if sender_tx:
            amounts = [t['amount'] for t in sender_tx] + [tx.amount]
            df["avg_sender_amount"] = np.mean(amounts)
            df["max_sender_amount"] = np.max(amounts)
            df["min_sender_amount"] = np.min(amounts)
            df["std_sender_amount"] = np.std(amounts) if len(amounts) > 1 else 0
            df["unique_receiver_count"] = len(set([t['receiver_wallet'] for t in sender_tx] + [tx.receiver_wallet]))
        else:
            df["avg_sender_amount"] = tx.amount
            df["max_sender_amount"] = tx.amount
            df["min_sender_amount"] = tx.amount
            df["std_sender_amount"] = 0
            df["unique_receiver_count"] = 1
        
        # Ratio features
        df["amount_ratio"] = df["amount"] / (df["avg_sender_amount"] + 1e-6)
        df["fee_ratio"] = df["fee"] / (df["amount"] + 1e-6)
        df["amount_to_avg_ratio"] = df["amount"] / (df["avg_sender_amount"] + 1e-6)
        
        # Ensure all expected features exist
        expected_features = [
            "log_amount", "log_fee", "hour_sin", "hour_cos", "day_sin", "day_cos",
            "is_weekend", "sender_tx_count", "avg_sender_amount", "max_sender_amount",
            "std_sender_amount", "unique_receiver_count", "amount_ratio", "fee_ratio",
            "amount_to_avg_ratio"
        ]
        
        for feature in expected_features:
            if feature not in df.columns:
                df[feature] = 0
        
        # Select features
        if features:
            X = df[features].fillna(0)
        else:
            X = df[expected_features].fillna(0)
        
        # Scale features if scaler exists
        if scaler is not None:
            try:
                X_scaled = scaler.transform(X)
                return pd.DataFrame(X_scaled, columns=X.columns)
            except:
                return X
        
        return X
        
    except Exception as e:
        logger.error(f"Error extracting features: {e}")
        if features:
            return pd.DataFrame([[0] * len(features)], columns=features)
        return pd.DataFrame()

def update_sender_history(tx: Transaction):
    """Update sender history with new transaction"""
    try:
        if tx.sender_wallet not in sender_history:
            sender_history[tx.sender_wallet] = []
        
        tx_dict = tx.dict()
        tx_dict['timestamp'] = tx.timestamp
        
        sender_history[tx.sender_wallet].append(tx_dict)
        
        # Limit history
        if len(sender_history[tx.sender_wallet]) > 1000:
            sender_history[tx.sender_wallet] = sender_history[tx.sender_wallet][-1000:]
            
    except Exception as e:
        logger.error(f"Error updating sender history: {e}")

@app.post("/predict", response_model=FraudPrediction)
@app.post("/predict-fraud-real-time", response_model=FraudPrediction)
async def predict_fraud(tx: Transaction):
    """Predict fraud for a single transaction"""
    try:
        logger.info(f"🔍 Predicting fraud: {tx.sender_wallet[:8]}... -> {tx.receiver_wallet[:8]}")
        logger.info(f"   Amount: {tx.amount}, Fee: {tx.fee}, Time: {tx.timestamp}")
        
        # Get sender history for probabilistic calculation
        sender_tx = sender_history.get(tx.sender_wallet, [])
        sender_tx_count = len(sender_tx)
        avg_amount = np.mean([t['amount'] for t in sender_tx]) if sender_tx else tx.amount
        
        # Check amount limit first (hard limit)
        if tx.amount > 6:
            result = FraudPrediction(
                fraud=True,
                probability=0.98,
                severity="High",
                reason=f"Transaction amount {tx.amount:.2f} QTOK exceeds maximum limit of 6 QTOK",
                features_used=features if features else [],
                model_version="1.0.0",
                risk_score=98,
                analysis_details={
                    "amount": tx.amount,
                    "limit": 6,
                    "exceeded": True,
                    "probabilistic_score": 0.98
                }
            )
            
            # Broadcast alert
            alert_data = {
                "type": "fraud_alert",
                "transaction": tx.dict(),
                "prediction": result.dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
            asyncio.create_task(manager.broadcast(alert_data))
            
            update_sender_history(tx)
            return result
        
        # Try to use ML model if available
        if model is not None:
            try:
                X = extract_features_from_transaction(tx)
                
                if not X.empty:
                    # Get model prediction
                    proba = float(model.predict_proba(X)[:, 1][0])
                    
                    # Override based on amount for probabilistic behavior
                    if tx.amount > 4:
                        # Blend model probability with deterministic factor
                        amount_factor = min(0.95, (tx.amount - 4) / 2 * 0.5 + 0.5)
                        proba = max(proba, amount_factor)
                    
                    pred = proba > 0.5
                    
                    # Determine severity
                    if proba < 0.3:
                        severity = "Low"
                    elif proba < 0.6:
                        severity = "Medium"
                    else:
                        severity = "High"
                    
                    # Generate reason
                    reasons = []
                    if tx.amount > 4:
                        reasons.append(f"Amount {tx.amount:.2f} exceeds risk threshold")
                    if sender_tx_count > 10:
                        reasons.append(f"High transaction frequency")
                    if not reasons:
                        if proba < 0.3:
                            reasons.append("Transaction appears normal")
                        elif proba < 0.6:
                            reasons.append("Moderate risk detected")
                        else:
                            reasons.append("Multiple risk factors detected")
                    
                    reason = " | ".join(reasons)
                    
                    result = FraudPrediction(
                        fraud=bool(pred),
                        probability=float(proba),
                        severity=severity,
                        reason=reason,
                        features_used=features if features else [],
                        model_version="1.0.0",
                        risk_score=int(proba * 100),
                        analysis_details={
                            "model_used": True,
                            "model_probability": float(proba),
                            "amount": tx.amount,
                            "sender_tx_count": sender_tx_count,
                            "avg_amount": float(avg_amount)
                        }
                    )
                    
                    logger.info(f"✅ Model prediction: Fraud={result.fraud}, Probability={proba:.2f}, Severity={severity}")
                    
                    update_sender_history(tx)
                    
                    # Broadcast if high risk
                    if result.fraud or result.probability > 0.3:
                        alert_data = {
                            "type": "fraud_alert",
                            "transaction": tx.dict(),
                            "prediction": result.dict(),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        asyncio.create_task(manager.broadcast(alert_data))
                    
                    return result
                    
            except Exception as e:
                logger.error(f"Model prediction error: {e}, falling back to probabilistic")
        
        # Fallback to probabilistic calculation
        risk_data = calculate_probabilistic_risk(tx.amount, sender_tx_count, avg_amount)
        
        result = FraudPrediction(
            fraud=risk_data["probability"] > 0.5,
            probability=risk_data["probability"],
            severity=risk_data["severity"],
            reason=risk_data["reason"],
            features_used=[],
            model_version="1.0.0 (probabilistic)",
            risk_score=int(risk_data["probability"] * 100),
            analysis_details=risk_data["analysis_details"]
        )
        
        logger.info(f"✅ Probabilistic prediction: Fraud={result.fraud}, Probability={result.probability:.2f}, Severity={result.severity}")
        
        update_sender_history(tx)
        
        # Broadcast if high risk
        if result.fraud or result.probability > 0.3:
            alert_data = {
                "type": "fraud_alert",
                "transaction": tx.dict(),
                "prediction": result.dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
            asyncio.create_task(manager.broadcast(alert_data))
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        logger.error(traceback.format_exc())
        
        # Return safe fallback
        return FraudPrediction(
            fraud=False,
            probability=0.1,
            severity="Low",
            reason="Error in fraud detection, assuming safe",
            features_used=[],
            model_version="1.0.0 (error fallback)",
            risk_score=10,
            analysis_details={"error": str(e)}
        )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        await websocket.send_json({
            "type": "welcome",
            "message": "Connected to Fraud Detection WebSocket",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                try:
                    message = json.loads(data)
                    if message.get("type") == "ping":
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                except json.JSONDecodeError:
                    pass
            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({
                        "type": "heartbeat",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except:
                    break
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "model_status": "loaded" if model else "probabilistic",
            "active_connections": len(manager.active_connections),
            "sender_history_count": sum(len(txs) for txs in sender_history.values()),
            "version": "1.0.0"
        }
    )

@app.get("/risk-stats")
async def get_risk_stats():
    """Get risk statistics for dashboard"""
    total_tx = sum(len(txs) for txs in sender_history.values())
    high_risk = 0
    medium_risk = 0
    low_risk = 0
    
    for txs in sender_history.values():
        for tx in txs:
            amount = tx.get('amount', 0)
            if amount > 4:
                high_risk += 1
            elif amount > 2:
                medium_risk += 1
            else:
                low_risk += 1
    
    return {
        "total_transactions": total_tx,
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": low_risk,
        "max_amount_allowed": 6,
        "risk_threshold": 4
    }

@app.get("/transaction-analysis/{hash}")
async def get_transaction_analysis(hash: str):
    """Get detailed analysis for a specific transaction"""
    # Look up transaction in history (simplified - in production, query database)
    for txs in sender_history.values():
        for tx in txs:
            if tx.get('tx_hash') == hash:
                amount = tx.get('amount', 0)
                risk_data = calculate_probabilistic_risk(amount)
                
                return {
                    "transaction": tx,
                    "analysis": {
                        "probability": risk_data["probability"],
                        "severity": risk_data["severity"],
                        "reason": risk_data["reason"],
                        "details": risk_data["analysis_details"],
                        "timestamp": datetime.utcnow().isoformat()
                    }
                }
    
    return {"error": "Transaction not found"}

