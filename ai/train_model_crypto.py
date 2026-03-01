# src/ai/train_model_crypto.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
import joblib
import os
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_fraud_detection_model():
    """Train fraud detection model"""
    try:
        # Load dataset
        logger.info("Loading dataset...")
        df = pd.read_csv("data/crypto_transactions.csv", parse_dates=["timestamp"])
        
        # Check if fraud column exists, create dummy if not
        if "fraud" not in df.columns:
            logger.warning("No fraud column found. Creating dummy labels for demonstration.")
            # Create dummy fraud labels (5% fraud)
            np.random.seed(42)
            df["fraud"] = np.random.choice([0, 1], size=len(df), p=[0.95, 0.05])
        
        logger.info(f"Dataset loaded: {len(df)} transactions")
        logger.info(f"Fraud distribution: {df['fraud'].value_counts().to_dict()}")
        
        # Feature Engineering
        logger.info("Engineering features...")
        df["hour"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        df["day_of_month"] = df["timestamp"].dt.day
        df["is_weekend"] = df["day_of_week"].isin([5,6]).astype(int)
        df["log_amount"] = np.log1p(df["amount"])
        df["log_fee"] = np.log1p(df["fee"] + 1e-6)
        
        # Transaction velocity features
        df["tx_count_last_hour"] = 0
        df["tx_count_last_day"] = 0
        
        # Sender behavior features
        logger.info("Calculating sender behavior features...")
        df["sender_tx_count"] = df.groupby("sender_wallet")["sender_wallet"].transform("count")
        df["avg_sender_amount"] = df.groupby("sender_wallet")["amount"].transform("mean")
        df["max_sender_amount"] = df.groupby("sender_wallet")["amount"].transform("max")
        df["min_sender_amount"] = df.groupby("sender_wallet")["amount"].transform("min")
        df["std_sender_amount"] = df.groupby("sender_wallet")["amount"].transform("std").fillna(0)
        df["unique_receiver_count"] = df.groupby("sender_wallet")["receiver_wallet"].transform("nunique")
        
        # Amount ratios
        df["amount_ratio"] = df["amount"] / (df["avg_sender_amount"] + 1e-6)
        df["fee_ratio"] = df["fee"] / (df["amount"] + 1e-6)
        df["amount_to_avg_ratio"] = df["amount"] / (df["avg_sender_amount"] + 1e-6)
        
        # Time-based features
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"]/24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"]/24)
        df["day_sin"] = np.sin(2 * np.pi * df["day_of_week"]/7)
        df["day_cos"] = np.cos(2 * np.pi * df["day_of_week"]/7)
        
        # Define features
        features = [
            "log_amount", "log_fee", "hour_sin", "hour_cos", "day_sin", "day_cos",
            "is_weekend", "sender_tx_count", "avg_sender_amount", "max_sender_amount",
            "std_sender_amount", "unique_receiver_count", "amount_ratio", "fee_ratio",
            "amount_to_avg_ratio"
        ]
        
        # Check if all features exist
        missing_features = [f for f in features if f not in df.columns]
        if missing_features:
            logger.warning(f"Missing features: {missing_features}. Creating them...")
            for f in missing_features:
                df[f] = 0
        
        X = df[features].fillna(0)
        y = df["fraud"]
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Split dataset
        logger.info("Splitting dataset...")
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, stratify=y, test_size=0.2, random_state=42
        )
        
        logger.info(f"Training set: {X_train.shape[0]} samples")
        logger.info(f"Test set: {X_test.shape[0]} samples")
        
        # Train model
        logger.info("Training Random Forest model...")
        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        
        # Cross-validation
        cv_scores = cross_val_score(rf, X_train, y_train, cv=5, scoring='roc_auc')
        logger.info(f"Cross-validation AUC scores: {cv_scores}")
        logger.info(f"Mean CV AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # Train on full training set
        rf.fit(X_train, y_train)
        
        # Evaluate
        logger.info("Evaluating model...")
        y_pred = rf.predict(X_test)
        y_pred_proba = rf.predict_proba(X_test)[:, 1]
        
        print("\n" + "="*50)
        print("MODEL EVALUATION")
        print("="*50)
        print(classification_report(y_test, y_pred))
        
        auc = roc_auc_score(y_test, y_pred_proba)
        print(f"AUC Score: {auc:.4f}")
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print(f"\nConfusion Matrix:")
        print(f"True Negatives: {cm[0,0]}")
        print(f"False Positives: {cm[0,1]}")
        print(f"False Negatives: {cm[1,0]}")
        print(f"True Positives: {cm[1,1]}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': features,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Important Features:")
        print(feature_importance.head(10))
        
        # Create model directory if it doesn't exist
        os.makedirs("src/ai/model", exist_ok=True)
        
        # Save model and artifacts
        logger.info("Saving model and artifacts...")
        joblib.dump(rf, "src/ai/model/model.pkl")
        joblib.dump(features, "src/ai/model/features.pkl")
        joblib.dump(scaler, "src/ai/model/scaler.pkl")
        
        # Save training metadata
        metadata = {
            "training_date": datetime.now().isoformat(),
            "n_samples": len(df),
            "n_fraud": df["fraud"].sum(),
            "fraud_rate": df["fraud"].mean(),
            "features": features,
            "auc_score": auc,
            "cv_mean_auc": cv_scores.mean(),
            "model_type": "RandomForestClassifier",
            "n_estimators": 200,
            "random_state": 42
        }
        
        joblib.dump(metadata, "src/ai/model/metadata.pkl")
        
        print("\n" + "="*50)
        print("✅ Model training completed successfully!")
        print(f"📁 Model saved to: src/ai/model/model.pkl")
        print(f"📊 Test AUC: {auc:.4f}")
        print("="*50)
        
        return rf, features, auc
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        raise

if __name__ == "__main__":
    train_fraud_detection_model()