# quantum/config.py
import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class QuantumConfig:
    # Server configuration
    HOST = os.getenv("QUANTUM_HOST", "0.0.0.0")
    PORT = int(os.getenv("QUANTUM_PORT", "8001"))
    DEBUG = os.getenv("QUANTUM_DEBUG", "True").lower() == "true"
    
    # Security configuration
    ALGORITHMS = {
        "KYBER": {
            "versions": ["Kyber512", "Kyber768", "Kyber1024"],
            "default": "Kyber768",
            "description": "Key Encapsulation Mechanism (KEM)"
        },
        "DILITHIUM": {
            "versions": ["Dilithium2", "Dilithium3", "Dilithium5"],
            "default": "Dilithium2",
            "description": "Digital Signature Algorithm"
        }
    }
    
    # Key storage
    KEY_STORAGE_PATH = os.getenv("QUANTUM_KEY_PATH", "./quantum/keys")
    
    @classmethod
    def get_algorithm_config(cls, algorithm_name: str) -> Dict[str, Any]:
        """Get configuration for a specific algorithm"""
        for category, config in cls.ALGORITHMS.items():
            if algorithm_name in config["versions"]:
                return {
                    "category": category,
                    "version": algorithm_name,
                    "description": config["description"]
                }
        raise ValueError(f"Unknown algorithm: {algorithm_name}")

config = QuantumConfig()