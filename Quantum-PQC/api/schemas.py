# quantum/api/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum

class SecurityLevel(str, Enum):
    KYBER512 = "Kyber512"
    KYBER768 = "Kyber768"
    KYBER1024 = "Kyber1024"
    DILITHIUM2 = "Dilithium2"
    DILITHIUM3 = "Dilithium3"
    DILITHIUM5 = "Dilithium5"

class GenerateWalletRequest(BaseModel):
    security_level: SecurityLevel = Field(default=SecurityLevel.KYBER768)
    signature_level: SecurityLevel = Field(default=SecurityLevel.DILITHIUM2)
    password: Optional[str] = None

class WalletResponse(BaseModel):
    wallet_id: str
    kyber_public_key: str
    dilithium_public_key: str
    security: Dict[str, Any]
    message: str = "Wallet generated successfully"

class SignTransactionRequest(BaseModel):
    wallet_id: str
    transaction: Dict[str, Any]
    password: Optional[str] = None

class SignedTransactionResponse(BaseModel):
    transaction: Dict[str, Any]
    signature: str
    algorithm: str
    security_level: str
    verified: bool = True

class VerifyTransactionRequest(BaseModel):
    signed_transaction: Dict[str, Any]
    public_wallet: Dict[str, Any]

class VerificationResponse(BaseModel):
    verified: bool
    message: str

class EncryptDataRequest(BaseModel):
    data: str
    public_key: str
    algorithm: SecurityLevel = SecurityLevel.KYBER768

class EncryptedDataResponse(BaseModel):
    encapsulation: str
    ciphertext: str
    iv: str
    tag: str
    algorithm: str

class DecryptDataRequest(BaseModel):
    encrypted_data: Dict[str, str]
    private_key: str
    password: Optional[str] = None

class DecryptedDataResponse(BaseModel):
    decrypted_data: str
    algorithm: str

class QuantumNFTHashRequest(BaseModel):
    image_data: str  # base64 encoded image
    metadata: Optional[Dict[str, Any]] = None

class QuantumNFTHashResponse(BaseModel):
    quantum_hash: str
    algorithm: str = "SHA3-256 + Kyber-derived"
    hash_length: int

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    algorithms: List[str]
    supported_security_levels: List[str]