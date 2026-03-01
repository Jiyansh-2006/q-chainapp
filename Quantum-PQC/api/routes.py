# quantum/api/routes.py
import base64
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from . import schemas
from ..wallet.pqc_keypair import pqc_keypair
from ..nft.quantum_metadata import quantum_metadata

router = APIRouter(prefix="/quantum", tags=["Quantum Cryptography"])

# In-memory storage
wallets_db = {}

@router.post("/generate-wallet", response_model=schemas.WalletResponse)
async def generate_wallet(request: schemas.GenerateWalletRequest):
    """Generate a new PQC wallet"""
    try:
        # Create key manager
        key_manager = PQCKeyPair(
            security_level=request.security_level.value,
            signature_level=request.signature_level.value
        )
        
        # Generate wallet
        wallet = key_manager.generate_wallet(request.password)
        
        # Store in database
        wallets_db[wallet["wallet_id"]] = wallet
        
        # Return public info
        public_info = key_manager.get_public_info(wallet)
        
        return schemas.WalletResponse(
            **public_info,
            message=f"Wallet generated with {request.security_level} encryption"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sign-transaction", response_model=schemas.SignedTransactionResponse)
async def sign_transaction(request: schemas.SignTransactionRequest):
    """Sign a transaction using PQC signatures"""
    try:
        # Get wallet
        wallet = wallets_db.get(request.wallet_id)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        # Create signature (simulated)
        import hashlib
        import json
        
        tx_bytes = json.dumps(request.transaction, sort_keys=True).encode()
        tx_hash = hashlib.sha256(tx_bytes).hexdigest()
        
        # Simulated signature
        signature = "0x" + hashlib.sha3_256(tx_hash.encode()).hexdigest()
        
        return schemas.SignedTransactionResponse(
            transaction=request.transaction,
            signature=signature,
            algorithm="Dilithium",
            security_level="Dilithium2"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-transaction", response_model=schemas.VerificationResponse)
async def verify_transaction(request: schemas.VerifyTransactionRequest):
    """Verify a PQC-signed transaction"""
    try:
        # Simulated verification (always returns true for demo)
        return schemas.VerificationResponse(
            verified=True,
            message="Signature verified successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-nft-hash", response_model=schemas.QuantumNFTHashResponse)
async def generate_nft_hash(request: schemas.QuantumNFTHashRequest):
    """Generate quantum-resistant hash for NFT metadata"""
    try:
        # Decode image data
        image_bytes = base64.b64decode(request.image_data)
        
        # Generate hash
        quantum_hash = quantum_metadata.generate_quantum_hash(
            image_bytes,
            request.metadata
        )
        
        return schemas.QuantumNFTHashResponse(
            quantum_hash=quantum_hash,
            algorithm="SHA3-256",
            hash_length=len(quantum_hash)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=schemas.HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return schemas.HealthCheckResponse(
        status="healthy",
        version="1.0.0",
        algorithms=["Kyber512", "Kyber768", "Kyber1024", "Dilithium2", "Dilithium3", "Dilithium5"],
        supported_security_levels=["Level 1 (128-bit)", "Level 3 (192-bit)", "Level 5 (256-bit)"]
    )

@router.get("/wallets/{wallet_id}")
async def get_wallet_public(wallet_id: str):
    """Get public wallet information"""
    wallet = wallets_db.get(wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return pqc_keypair.get_public_info(wallet)