import sys
import os
import json 
from fastapi.testclient import TestClient

# --- Configuration ---
# Add the 'app' directory to the path for correct importing
# Assuming this script is run from the project root (Module 3)
sys.path.insert(0, os.path.join(os.getcwd(), 'app'))

try:
    # Attempt to import the FastAPI application instance
    from fastapi_app import app
except ImportError:
    print("Error: Could not import 'app' from 'fastapi_app.py'.")
    print("Ensure 'fastapi_app.py' is in the 'app' directory and defines 'app = FastAPI()'.")
    sys.exit(1)

# Initialize the TestClient using the imported FastAPI application
client = TestClient(app)

# --- 1. Define Test Data (Matching the Pydantic schema) ---
# This data includes ALL fields required by the TransactionData Pydantic model.
# NOTE: 'amount' is used to calculate 'log_amount' inside the API.
test_data = {
    "crypto_type": "BTC",
    "amount": 10.5,
    "fee": 0.001,
    "sender_wallet": "wallet_1234",
    "receiver_wallet": "wallet_5678",
    
    # Required Engineered Features (Must be provided by the client/test)
    "hour": 14,                
    "sender_tx_count": 5,      
    "avg_sender_amount": 2.5   
}

def test_read_main_status():
    """Test the root endpoint (/) to ensure the API is running."""
    response = client.get("/")
    assert response.status_code == 200
    
    # Assert against the EXACT response
    expected_response = {'msg': 'Fraud detection API is running ✅'}
    assert response.json() == expected_response
    
    print("✅ Root endpoint test passed.")

def test_predict_endpoint_success():
    """Test the main prediction endpoint with valid data."""
    response = client.post("/predict", json=test_data)
    
    print("\n--- API Prediction Test Results ---")
    
    if response.status_code != 200:
        # If prediction fails, print the full error detail from the server
        print(f"Prediction FAILED with Status Code: {response.status_code}")
        try:
            print(f"Server Error Details: {response.json()}")
        except json.JSONDecodeError:
            print(f"Server returned non-JSON content: {response.text}")
        
    # Assert success status code
    assert response.status_code == 200
    
    # Check the prediction format
    response_json = response.json()
    assert "prediction" in response_json
    assert "probability_fraud" in response_json
    # Check for binary prediction (0 or 1)
    assert response_json["prediction"] in [0, 1] 

    print("✅ Prediction endpoint test passed.")

def test_predict_endpoint_invalid_input():
    """Test the prediction endpoint with missing data (input validation)."""
    # Invalid data is intentionally missing the 'amount' field
    invalid_data = {
        "crypto_type": "ETH",
        "fee": 0.005,
        "sender_wallet": "wallet_1111",
        "receiver_wallet": "wallet_2222",
        "hour": 10,
        "sender_tx_count": 1,
        "avg_sender_amount": 100.0
        # Intentionally missing 'amount' to trigger Pydantic validation error (422)
    }
    
    response = client.post("/predict", json=invalid_data)
    
    # Assert the status code is 422 (Unprocessable Entity) for validation errors
    assert response.status_code == 422
    print("✅ Invalid input validation test passed (422 status code).")

if __name__ == '__main__':
    # Run all defined test functions sequentially
    print("Starting Model API Integration Tests...")
    
    tests = [
        ("Root Endpoint", test_read_main_status),
        ("Prediction Success", test_predict_endpoint_success),
        ("Prediction Invalid Input", test_predict_endpoint_invalid_input)
    ]
    
    all_passed = True
    for name, func in tests:
        try:
            func()
        except AssertionError as e:
            print(f"\n🛑 Assertion Failed in Test: {name}")
            print(f"Error: {e}")
            all_passed = False
            break
        except Exception as e:
            print(f"\n🛑 UNHANDLED EXCEPTION in Test: {name}")
            print(f"Error: {e}")
            all_passed = False
            break

    print("\n---------------------------------------------------------")
    if all_passed:
        print("All model integration tests completed successfully.")
    else:
        print("Integration tests failed. Review the output for the failure point.")
