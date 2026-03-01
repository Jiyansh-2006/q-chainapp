import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_synthetic_crypto_dataset(n_samples=10000, fraud_rate=0.03, crypto_types=['BTC', 'ETH', 'BNB', 'SOL', 'USDT']):
    """
    Generates a synthetic dataset for crypto transactions matching the requested categories.
    """
    np.random.seed(42)

    # --- 1. Basic Setup and Imbalance ---
    n_fraud = int(n_samples * fraud_rate)
    n_normal = n_samples - n_fraud

    # Create the target variable (fraud) with the specified imbalance
    labels = np.array([0] * n_normal + [1] * n_fraud)

    # --- 2. Feature Generation ---

    # Timestamp: Start from a recent date
    start_date = datetime(2024, 1, 1)
    time_deltas = [timedelta(minutes=i) for i in range(n_samples)]
    timestamps = [start_date + dt for dt in time_deltas]
    np.random.shuffle(timestamps) # Shuffle to randomize order

    # Crypto Type (Randomly distributed)
    crypto_type = np.random.choice(crypto_types, n_samples)

    # Wallets (Create a pool of wallets)
    wallet_pool = [f'wallet_{i:04d}' for i in range(5000)]
    sender_wallet = np.random.choice(wallet_pool, n_samples)
    # Ensure receiver is different from sender (mostly)
    receiver_wallet = [np.random.choice([w for w in wallet_pool if w != s]) for s in sender_wallet]

    # Amount and Fee (Key features to differentiate classes)
    # Amount (Log-normal distribution for typical transaction data)
    amounts_normal = np.random.lognormal(mean=2, sigma=1.0, size=n_normal)   # Mean ~ 7.4, Std Dev ~ 12
    amounts_fraud = np.random.lognormal(mean=5, sigma=1.5, size=n_fraud)     # Mean ~ 148, Std Dev ~ 500 (Higher and more volatile)
    amounts = np.concatenate([amounts_normal, amounts_fraud])

    # Fee (Typically a small fraction of the amount, with fraud having slightly higher/lower ratios)
    fees_normal = amounts_normal * np.random.uniform(0.001, 0.005, size=n_normal)
    fees_fraud = amounts_fraud * np.random.uniform(0.003, 0.008, size=n_fraud)
    fees = np.concatenate([fees_normal, fees_fraud])


    # --- 3. Assemble and Shuffle DataFrame ---
    data = pd.DataFrame({
        'tx_hash': [f'0x{i:08x}' for i in range(n_samples)], # Simple sequential hash
        'crypto_type': crypto_type,
        'amount': amounts,
        'fee': fees,
        'timestamp': timestamps,
        'sender_wallet': sender_wallet,
        'receiver_wallet': receiver_wallet,
        'fraud': labels
    })

    # Shuffle the dataset rows to mix normal and fraud cases
    data = data.sample(frac=1, random_state=42).reset_index(drop=True)

    # --- 4. Save to CSV ---
    file_path = 'data/crypto_transactions_new.csv'
    data.to_csv(file_path, index=False)

    print(f"✅ Successfully generated dataset with {n_samples} samples.")
    print(f"File saved to: {file_path}")
    print(f"Fraud Rate: {fraud_rate*100:.2f}%")
    print("\nClass Distribution:")
    print(data['fraud'].value_counts())

if __name__ == "__main__":
    generate_synthetic_crypto_dataset()