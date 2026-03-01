import joblib
import pandas as pd
import numpy as np
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# --- Configuration and File Paths ---
MODEL_PATH = os.path.join(os.getcwd(), 'model', 'model.pkl')
FEATURES_PATH = os.path.join(os.getcwd(), 'model', 'features.pkl')

# --- Model and Feature Loader ---
model = None
feature_names = None
try:
    # Use joblib to load the model and features list
    model = joblib.load(MODEL_PATH)
    feature_names = joblib.load(FEATURES_PATH)
    print(f"✅ Model and features loaded successfully.")
    print(f"Model expects features: {feature_names}")
except FileNotFoundError:
    print(f"🛑 Error: Model or features file not found. Paths checked: {MODEL_PATH}, {FEATURES_PATH}")
except Exception as e:
    print(f"🛑 Error loading model or features: {e}")

# --- Pydantic Input Schema ---
# The schema must reflect ALL raw inputs needed to calculate the features
class TransactionData(BaseModel):
    # Raw inputs for features:
    amount: float
    fee: float
    # Raw inputs for engineered features:
    hour: int
    sender_wallet: str 
    
    # We need to simulate the features that the model expects, 
    # but for a real API, the client would send the raw data, and 
    # the server would calculate the engineered features (tx_count, avg_amount).
    # Since we can't recalculate those from a single transaction, we assume 
    # the client (or an upstream system) provides them.

    # Assuming the API client MUST provide these engineered features:
    sender_tx_count: int
    avg_sender_amount: float

    # Features not used in the model, but necessary for context/OHE if used:
    crypto_type: str
    receiver_wallet: str 

# --- FastAPI Application ---
app = FastAPI()

@app.get("/")
def read_root():
    """Basic health check endpoint."""
    # Ensure this matches the test expectation
    return {"msg": "Fraud detection API is running ✅"}

@app.post("/predict")
def predict_fraud(data: TransactionData):
    global model, feature_names

    if model is None or feature_names is None:
        raise HTTPException(status_code=503, detail="Model is currently unavailable. Check server logs for file loading errors.")

    # --- 1. Prepare Input Data ---
    input_dict = data.model_dump()
    
    # Create a DataFrame from the single input record
    # IMPORTANT: Use the exact feature names saved from the training script
    # The training features are: ["log_amount", "fee", "hour", "sender_tx_count", "avg_sender_amount"]
    
    try:
        # Calculate log_amount which was done in the training script
        input_dict['log_amount'] = np.log1p(input_dict['amount'])
        
        # Select only the features the model expects, in the correct order
        # Ensure 'log_amount' is present before selection
        X_predict = pd.DataFrame([input_dict])[feature_names]
        
    except KeyError as e:
        # This will catch missing engineered features or required fields
        raise HTTPException(status_code=400, detail=f"Missing feature during selection: {e}. Required features: {feature_names}")

    # --- 2. Prediction ---
    # The .values converts the DataFrame row into a numpy array for the model
    try:
        prediction = model.predict(X_predict)[0]
        # Get probability for the minority class (1)
        probability = model.predict_proba(X_predict)[:, 1][0]
    except Exception as e:
        print(f"Error during model prediction: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed due to internal model error.")

    # Return the result
    return {
        "prediction": int(prediction),
        "probability_fraud": float(probability),
        "message": "Fraud detected" if prediction == 1 else "Normal transaction"
    }

# Ensure the model is loaded when the app starts (for local testing)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
