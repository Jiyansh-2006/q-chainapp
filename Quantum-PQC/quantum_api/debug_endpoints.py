# debug_endpoints.py
import requests

BASE_URL = "http://localhost:8000"

def list_all_endpoints():
    """List all available endpoints"""
    try:
        # Try to get OpenAPI schema
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            schema = response.json()
            print("✓ OpenAPI schema available")
            print("\nAvailable paths:")
            for path in schema.get("paths", {}).keys():
                print(f"  - {path}")
            print()
            
            # Also check /docs
            print("API documentation available at:")
            print(f"  {BASE_URL}/docs")
            print(f"  {BASE_URL}/redoc")
            return True
        else:
            print("✗ OpenAPI schema not available")
            return False
    except Exception as e:
        print(f"✗ Cannot connect to API: {e}")
        return False

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health endpoint ({response.status_code}):")
        print(f"  URL: {BASE_URL}/health")
        print(f"  Response: {response.json()}")
        print()
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Health endpoint error: {e}")
        return False

def test_root():
    """Test root endpoint"""
    try:
        response = requests.get(BASE_URL)
        print(f"Root endpoint ({response.status_code}):")
        print(f"  URL: {BASE_URL}")
        print(f"  Response: {response.json()}")
        print()
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Root endpoint error: {e}")
        return False

def test_sign():
    """Try different sign endpoint variations"""
    payload = {
        "wallet_id": "test_wallet_1",
        "transaction": {
            "amount": 100,
            "to": "recipient_456",
            "nonce": 1,
            "timestamp": "2023-01-01T00:00:00Z"
        },
        "algorithm": "ecdsa"
    }
    
    endpoints_to_try = [
        "/sign",
        "/api/sign",
        "/v1/sign",
        "/sign/",
        "/api/sign/"
    ]
    
    for endpoint in endpoints_to_try:
        try:
            print(f"Trying {endpoint}...")
            response = requests.post(
                f"{BASE_URL}{endpoint}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            print(f"  Status: {response.status_code}")
            if response.status_code != 405:
                print(f"  Response: {response.json()}")
                print(f"\n✓ Success! Use endpoint: {endpoint}")
                return endpoint
        except Exception as e:
            print(f"  Error: {e}")
    
    print("\n✗ Could not find working sign endpoint")
    return None

if __name__ == "__main__":
    print("=" * 60)
    print("API Debug Tool")
    print("=" * 60)
    print()
    
    print("1. Testing connection...")
    test_root()
    
    print("2. Testing health endpoint...")
    test_health()
    
    print("3. Getting available endpoints...")
    list_all_endpoints()
    
    print("4. Finding sign endpoint...")
    working_endpoint = test_sign()
    
    if working_endpoint:
        print(f"\n✅ Use this endpoint: POST {BASE_URL}{working_endpoint}")
    else:
        print("\n❌ Could not find sign endpoint. Possible issues:")
        print("   - FastAPI app is not running on port 8000")
        print("   - The /sign route is not defined in your main.py")
        print("   - You have CORS or middleware blocking the request")
        print("\nRun this command to see if server is running:")
        print("   ps aux | grep uvicorn")
        print("\nOr check if another service is using port 8000:")
        print("   lsof -i :8000")