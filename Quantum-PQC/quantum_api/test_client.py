# test_fixed_client.py
import requests
import json
import time

class QChainClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        
    def health(self):
        """Check API health"""
        try:
            response = requests.get(f"{self.base_url}/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Health check failed: {e}")
            return None
    
    def sign_transaction(self, wallet_id, amount, recipient, algorithm="ecdsa", use_zkp=True):
        """Sign a transaction"""
        payload = {
            "wallet_id": wallet_id,
            "transaction": {
                "amount": amount,
                "to": recipient,
                "nonce": int(time.time() * 1000),  # Unique nonce
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "algorithm": algorithm
        }
        
        if use_zkp:
            payload["zkp"] = {
                "amount_gt_zero": True,
                "nonce_fresh": True,
                "balance_sufficient": True
            }
        
        try:
            print(f"\nSigning transaction with {algorithm}...")
            print(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                f"{self.base_url}/sign",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Success! Signature: {result['signature'][:50]}...")
                print(f"   Algorithm: {result['algorithm']}")
                print(f"   Security analysis: {result['cryptanalysis']['secure']}")
                return result
            else:
                print(f"❌ Failed with status {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {json.dumps(error_detail, indent=2)}")
                except:
                    print(f"   Response: {response.text}")
                return None
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to {self.base_url}")
            print("   Make sure the server is running: uvicorn main:app --reload")
            return None
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return None
    
    def list_wallets(self):
        """List registered wallets"""
        try:
            response = requests.get(f"{self.base_url}/wallets")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"List wallets failed: {e}")
            return None

def main():
    print("=" * 60)
    print("QChain API Test Client")
    print("=" * 60)
    
    client = QChainClient("http://localhost:8000")
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    health = client.health()
    if health:
        print(f"   Status: {health.get('status', 'unknown')}")
        print(f"   Timestamp: {health.get('timestamp', 'unknown')}")
    else:
        print("   ❌ Cannot connect to API")
        print("\n   Please start the server first:")
        print("   $ uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return
    
    # Test 2: List wallets
    print("\n2. Listing wallets...")
    wallets = client.list_wallets()
    if wallets:
        print(f"   Registered wallets: {wallets.get('count', 0)}")
    
    # Test 3: Sign with ECDSA (should work)
    print("\n3. Testing ECDSA signing...")
    ecdsa_result = client.sign_transaction(
        wallet_id="test_wallet_1",
        amount=100.50,
        recipient="recipient_abc123",
        algorithm="ecdsa",
        use_zkp=True
    )
    
    # Test 4: Try with same wallet again
    print("\n4. Testing second transaction with same wallet...")
    client.sign_transaction(
        wallet_id="test_wallet_1",
        amount=50.25,
        recipient="recipient_xyz789",
        algorithm="ecdsa",
        use_zkp=True
    )
    
    # Test 5: Try PQC (might fail if library not installed)
    print("\n5. Testing PQC signing...")
    pqc_result = client.sign_transaction(
        wallet_id="pqc_wallet_1",
        amount=75.00,
        recipient="recipient_pqc",
        algorithm="pqc",
        use_zkp=True
    )
    
    if not pqc_result:
        print("   ℹ️  PQC might not be available. Try installing python-oqs:")
        print("   $ pip install python-oqs")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)
    
    # Show API documentation URLs
    print("\nAPI Documentation:")
    print(f"  - Swagger UI: http://localhost:8000/docs")
    print(f"  - ReDoc: http://localhost:8000/redoc")

if __name__ == "__main__":
    main()