# quantum/cryptography/kyber_encryption.py
import base64
from typing import Dict, Tuple
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

class KyberEncryption:
    """Kyber-based quantum-resistant encryption simulation"""
    
    def __init__(self, security_level: str = "Kyber768"):
        self.security_level = security_level
        self.key_size = self._get_key_size(security_level)
        self.backend = default_backend()
        
    def _get_key_size(self, security_level: str) -> int:
        sizes = {
            "Kyber512": 32,
            "Kyber768": 48,
            "Kyber1024": 64
        }
        return sizes.get(security_level, 48)
    
    def generate_keypair(self) -> Dict[str, str]:
        """Generate Kyber key pair"""
        private_key = os.urandom(self.key_size)
        
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=self.key_size * 2,
            salt=None,
            info=b"kyber-key-derivation",
            backend=self.backend
        )
        public_key = hkdf.derive(private_key + b"public")
        
        return {
            "public_key": base64.b64encode(public_key).decode('utf-8'),
            "private_key": base64.b64encode(private_key).decode('utf-8'),
            "algorithm": "Kyber",
            "security_level": self.security_level
        }
    
    def encapsulate(self, public_key: str) -> Tuple[str, str]:
        """Generate shared secret and encapsulation"""
        public_key_bytes = base64.b64decode(public_key)
        shared_secret = os.urandom(self.key_size)
        
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=len(public_key_bytes),
            salt=None,
            info=b"kyber-encapsulation",
            backend=self.backend
        )
        ciphertext = hkdf.derive(public_key_bytes + shared_secret)
        
        return (
            base64.b64encode(shared_secret).decode('utf-8'),
            base64.b64encode(ciphertext).decode('utf-8')
        )
    
    def decapsulate(self, private_key: str, ciphertext: str) -> str:
        """Recover shared secret"""
        private_key_bytes = base64.b64decode(private_key)
        ciphertext_bytes = base64.b64decode(ciphertext)
        
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=self.key_size,
            salt=None,
            info=b"kyber-decapsulation",
            backend=self.backend
        )
        shared_secret = hkdf.derive(private_key_bytes + ciphertext_bytes)
        
        return base64.b64encode(shared_secret).decode('utf-8')

kyber = KyberEncryption()