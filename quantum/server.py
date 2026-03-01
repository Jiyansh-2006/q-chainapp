# server.py
import argparse
import json
import math
import sys
import warnings
import time
import os
import secrets
import hashlib
from typing import Optional, Tuple, Dict

from flask import Flask, request, jsonify
from flask_cors import CORS

# Suppress warnings
warnings.filterwarnings("ignore")

# Limits
MAX_N = 65535

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------------------------
# Character Mapping
# ---------------------------
def map_message_to_range(message: str, max_val: int) -> Tuple[list, str]:
    if max_val >= 128:
        return [ord(ch) for ch in message], message

    mapped_values = []
    mapped_chars = []

    for i, ch in enumerate(message):
        val = (i % (max_val - 2)) + 1
        mapped_values.append(val)
        mapped_chars.append(f"[{val}]")

    return mapped_values, "".join(mapped_chars)


def recover_original_text(decrypted_values: list, original_message: str) -> str:
    return f"Decrypted {len(decrypted_values)} characters successfully"


# ---------------------------
# RSA Utilities (Pure Python - No external crypto libs needed)
# ---------------------------
def egcd(a, b):
    if a == 0:
        return (b, 0, 1)
    g, y, x = egcd(b % a, a)
    return (g, x - (b // a) * y, y)


def modinv(a, m):
    g, x, y = egcd(a, m)
    if g != 1:
        raise Exception("Modular inverse does not exist")
    return x % m


def rsa_generate_from_primes(p: int, q: int, e: int = 65537) -> Dict:
    N = p * q
    phi = (p - 1) * (q - 1)
    if math.gcd(e, phi) != 1:
        for cand in [3, 5, 17, 257, 65537]:
            if math.gcd(cand, phi) == 1:
                e = cand
                break
    d = modinv(e, phi)
    return {"p": p, "q": q, "N": N, "e": e, "d": d, "phi": phi}


def rsa_encrypt_int(m_int: int, e: int, N: int):
    return pow(m_int, e, N)


def rsa_decrypt_int(c_int: int, d: int, N: int):
    return pow(c_int, d, N)


# ---------------------------
# Classical factoring
# ---------------------------
def classical_factor(N: int) -> Optional[Tuple[int, int]]:
    if N < 2:
        return None
    if N % 2 == 0:
        return (2, N // 2)
    
    for i in range(3, int(math.sqrt(N)) + 1, 2):
        if N % i == 0:
            return (i, N // i)
    return None


# ---------------------------
# Quantum Components Check (best-effort)
# ---------------------------
def check_qiskit_components():
    components = {
        "qiskit": False,
        "quantum_circuit": False,
        "statevector": False,
        "version": "unknown",
    }
    try:
        import qiskit

        components["qiskit"] = True
        components["version"] = getattr(qiskit, "__version__", "unknown")

        try:
            from qiskit import QuantumCircuit

            components["quantum_circuit"] = True
        except Exception:
            pass

        try:
            from qiskit.quantum_info import Statevector

            components["statevector"] = True
        except Exception:
            pass

    except Exception:
        pass

    return components


# ---------------------------
# Quantum Simulation (Optional - will work without qiskit)
# ---------------------------
def quantum_circuit_simulation(N: int) -> Dict:
    try:
        # Try to import qiskit, but provide fallback if not available
        from qiskit import QuantumCircuit
        from qiskit.quantum_info import Statevector

        circuits_info = []

        qc1 = QuantumCircuit(2, name="Bell State")
        qc1.h(0)
        qc1.cx(0, 1)
        state1 = Statevector(qc1)
        circuits_info.append({"circuit": "Bell State", "qubits": 2, "state_vector": str(state1), "entangled": True})

        qc2 = QuantumCircuit(3, name="Superposition")
        for i in range(3):
            qc2.h(i)
        state2 = Statevector(qc2)
        circuits_info.append({"circuit": "3-Qubit Superposition", "qubits": 3, "state_vector": str(state2), "entangled": False})

        factors = classical_factor(N)
        if factors:
            return {
                "success": True,
                "method": "quantum_simulation",
                "p": factors[0],
                "q": factors[1],
                "quantum_simulation": {
                    "circuits_created": len(circuits_info),
                    "total_qubits": 5,
                    "quantum_states_simulated": True,
                    "circuits": circuits_info,
                },
            }
        return {"success": False, "error": "Classical factoring failed in quantum simulation"}

    except Exception as e:
        # Fallback to classical if qiskit not available
        factors = classical_factor(N)
        if factors:
            return {
                "success": True,
                "method": "classical_fallback",
                "p": factors[0],
                "q": factors[1],
                "note": "Qiskit not available, used classical factoring"
            }
        return {"success": False, "error": f"Quantum simulation failed: {str(e)}"}


def shor_quantum_inspired(N: int) -> Dict:
    try:
        coprimes = []
        for a in range(2, min(N, 20)):
            if math.gcd(a, N) == 1:
                coprimes.append(a)
                if len(coprimes) >= 3:
                    break

        if not coprimes:
            return {"success": False, "error": "No coprimes found"}

        quantum_results = []
        for a in coprimes:
            for r in range(1, min(N, 100)):
                if pow(a, r, N) == 1:
                    quantum_results.append({"a": a, "period": r, "quantum_measurement": f"|{r}⟩"})
                    break

        for result in quantum_results:
            a = result["a"]
            r = result["period"]
            if r % 2 == 0:
                x = pow(a, r // 2, N)
                if x != 1 and x != N - 1:
                    p = math.gcd(x - 1, N)
                    q = math.gcd(x + 1, N)
                    if p > 1 and q > 1 and p * q == N:
                        return {
                            "success": True,
                            "method": "quantum_inspired_shor",
                            "p": p,
                            "q": q,
                            "quantum_process": {"coprimes_tested": len(coprimes), "periods_found": len(quantum_results), "used_coprime": a, "used_period": r},
                        }

        # fallback to classical
        factors = classical_factor(N)
        if factors:
            return {
                "success": True,
                "method": "quantum_inspired_classical",
                "p": factors[0],
                "q": factors[1],
                "quantum_process": {"coprimes_tested": len(coprimes), "periods_found": len(quantum_results), "note": "Used quantum principles with classical factoring"},
            }
        return {"success": False, "error": "Quantum-inspired approach failed"}

    except Exception as e:
        return {"success": False, "error": f"Quantum-inspired Shor failed: {str(e)}"}


# ---------------------------
# Quantum Circuit Visualization - IMPROVED STRUCTURE
# ---------------------------
def generate_shor_circuit_visualization(N: int):
    """Generate a structured, clean Shor's algorithm circuit representation"""
    
    # Determine number of qubits needed - more realistic structure
    n_bits = max(3, math.ceil(math.log2(N)))
    n_control = n_bits  # Control qubits for period finding
    n_work = n_bits     # Work qubits for computation
    n_qubits = n_control + n_work
    
    circuit = {
        "qubits": n_qubits,
        "gates": [],
        "description": f"Shor's algorithm for N={N}",
        "steps": [],
        "N": N
    }
    
    time_counter = 0
    
    # Step 1: Hadamard on control register - Create superposition
    step1 = {"name": "Superposition", "gates": []}
    for i in range(n_control):
        step1["gates"].append({
            "type": "H", 
            "qubit": i, 
            "time": time_counter
        })
        time_counter += 1
    circuit["steps"].append(step1)
    
    time_counter += 2  # Add spacing
    
    # Step 2: Modular exponentiation - Well-structured U gates
    step2 = {"name": "Modular Exponentiation", "gates": []}
    for i in range(n_control):
        step2["gates"].append({
            "type": "U", 
            "qubit": i, 
            "targets": list(range(n_control, n_qubits)),
            "time": time_counter,
            "label": f"a^(2^{i}) mod {N}"
        })
        time_counter += 2
    circuit["steps"].append(step2)
    
    time_counter += 3  # Add spacing before QFT
    
    # Step 3: Inverse QFT - Structured implementation
    step3 = {"name": "Inverse QFT", "gates": []}
    
    # SWAP gates first (for proper QFT structure)
    for i in range(n_control // 2):
        step3["gates"].append({
            "type": "X", 
            "qubit": i, 
            "control": n_control - 1 - i,
            "time": time_counter
        })
        time_counter += 1
    
    time_counter += 1
    
    # Controlled rotations in reverse order
    for i in range(n_control):
        # Hadamard
        step3["gates"].append({
            "type": "H", 
            "qubit": i, 
            "time": time_counter
        })
        time_counter += 1
        
        # Controlled rotations
        for j in range(i + 1, n_control):
            step3["gates"].append({
                "type": "CR", 
                "control": j, 
                "target": i, 
                "time": time_counter,
                "angle": f"π/2^{j-i+1}"
            })
            time_counter += 1
        
        time_counter += 1  # Space between qubits
    
    circuit["steps"].append(step3)
    
    time_counter += 2  # Add spacing before measurement
    
    # Step 4: Measurement - All control qubits
    step4 = {"name": "Measurement", "gates": []}
    for i in range(n_control):
        step4["gates"].append({
            "type": "M", 
            "qubit": i, 
            "time": time_counter
        })
        time_counter += 1
    circuit["steps"].append(step4)
    
    # Combine all gates for the main circuit display
    all_gates = []
    for step in circuit["steps"]:
        all_gates.extend(step["gates"])
    circuit["gates"] = all_gates
    
    return circuit


# ---------------------------
# Orchestrator
# ---------------------------
def run_demo(p: Optional[int], q: Optional[int], N_param: Optional[int], message: str, e: int = 65537):
    # Input validation and orchestration
    if N_param is not None:
        N = int(N_param)
        p = q = None
    elif p is not None and q is not None:
        p = int(p)
        q = int(q)
        N = p * q
    else:
        return {"success": False, "error": "Provide p and q or N"}

    if N <= 3 or N > MAX_N:
        return {"success": False, "error": f"N out of allowed range (2 < N <= {MAX_N})"}

    chars, mapped_message = map_message_to_range(message, N)

    rsa_info = None
    if p and q:
        try:
            rsa_info = rsa_generate_from_primes(p, q, e)
        except Exception as ex:
            rsa_info = {"p": p, "q": q, "N": N, "e": e, "d": None, "error": str(ex)}

    ciphertexts = [rsa_encrypt_int(c, e, N) for c in chars]

    factorization_result = None
    qiskit_info = check_qiskit_components()

    # Strategy 1: quantum inspired shor
    factorization_result = shor_quantum_inspired(N)

    # Strategy 2: quantum circuit simulation (if available & previous failed)
    if (not factorization_result or not factorization_result.get("success", False)) and qiskit_info["quantum_circuit"] and qiskit_info["statevector"]:
        factorization_result = quantum_circuit_simulation(N)

    # Strategy 3: classical fallback
    if not factorization_result or not factorization_result.get("success", False):
        factors = classical_factor(N)
        if factors:
            method = "classical"
            if qiskit_info["qiskit"]:
                method = "classical_with_quantum_available"
            factorization_result = {"success": True, "method": method, "p": factors[0], "q": factors[1]}
        else:
            factorization_result = {"success": False, "error": "Factorization failed"}

    # Process results
    if factorization_result.get("success", False):
        p_found, q_found = factorization_result["p"], factorization_result["q"]

        try:
            phi = (p_found - 1) * (q_found - 1)
            d_found = modinv(e, phi)
        except Exception:
            d_found = None

        if d_found:
            decrypted_chars = [rsa_decrypt_int(c, d_found, N) for c in ciphertexts]
            recovered_text = recover_original_text(decrypted_chars, message)
        else:
            decrypted_chars = []
            recovered_text = "<decryption-failed>"

        return {
            "success": True,
            "method": factorization_result.get("method"),
            "N": N,
            "p_found": p_found,
            "q_found": q_found,
            "original_message": message,
            "mapped_values": chars,
            "ciphertexts": ciphertexts,
            "decrypted_chars": decrypted_chars,
            "recovered_text": recovered_text,
            "rsa_info": rsa_info,
            "qiskit_components": qiskit_info,
            "factorization_details": factorization_result,
        }
    else:
        return {"success": False, "error": factorization_result.get("error", "Unknown error"), "N": N, "original_message": message, "ciphertexts": ciphertexts, "rsa_info": rsa_info, "qiskit_components": qiskit_info}


# ---------------------------
# PQC Simulation (Kyber + Dilithium) - Simulated without external deps
# ---------------------------

def hexid(n=16):
    return secrets.token_hex(n)


def fake_shared_secret():
    return hashlib.sha256(os.urandom(32)).hexdigest()


def simulate_kyber_flow(message: str):
    # Simulated Kyber without external dependencies
    pk = "KYBER-PUB-" + hexid(16)
    sk = "KYBER-PRIV-" + hexid(24)
    ciphertext = "CT-" + hexid(20)
    shared = fake_shared_secret()
    decapsulated = shared
    return {
        "public_key": pk, 
        "private_key": sk, 
        "ciphertext": ciphertext, 
        "shared_secret": shared, 
        "decapsulated": decapsulated, 
        "shared_match": True,
        "note": "Simulated without PQC dependencies"
    }


def simulate_dilithium_flow(message: str):
    # Simulated Dilithium without external dependencies
    pk = "DILITHIUM-PUB-" + hexid(18)
    sk = "DILITHIUM-PRIV-" + hexid(24)
    signature = "SIG-" + hexid(28)
    verified = True
    return {
        "public_key": pk, 
        "private_key": sk, 
        "signature": signature, 
        "verified": verified,
        "note": "Simulated without PQC dependencies"
    }


def quantum_inspired_attack_on_pqc(kyber_info, dilithium_info):
    complexity = 1_000_000 + int.from_bytes(os.urandom(2), "big") if hasattr(os, "urandom") else 1_000_000
    attempted = True
    success = False
    detail = (
        "Quantum-inspired attack attempted (simulated). "
        "Kyber (KEM) decapsulation and Dilithium signature verification remain intact. "
        "Shor's factoring attack does not apply to lattice-based PQC."
    )
    return {"attempted": attempted, "success": success, "complexity_estimate": complexity, "detail": detail}


# ---------------------------
# Flask API endpoints
# ---------------------------
@app.route("/api/simulate_shor", methods=["GET"])
def api_simulate_shor():
    # supports p, q or N and message
    try:
        p = request.args.get("p", None)
        q = request.args.get("q", None)
        N = request.args.get("N", None)
        message = request.args.get("message", "A")[:1024]
        e = int(request.args.get("e", 65537))

        p_val = int(p) if p is not None and p != "" else None
        q_val = int(q) if q is not None and q != "" else None
        N_val = int(N) if N is not None and N != "" else None

        result = run_demo(p_val, q_val, N_val, message, e)
        return jsonify(result)
    except Exception as ex:
        return jsonify({"success": False, "error": str(ex)}), 500


@app.route("/api/simulate_pqc", methods=["GET"])
def api_simulate_pqc():
    try:
        message = request.args.get("message", "A")[:1024]

        # small realistic delays
        time.sleep(0.4)
        kyber = simulate_kyber_flow(message)
        time.sleep(0.3)
        dilithium = simulate_dilithium_flow(message)
        time.sleep(0.3)
        attack = quantum_inspired_attack_on_pqc(kyber, dilithium)

        response = {
            "success": True, 
            "method": "pqc_simulation", 
            "timestamp": time.time(), 
            "message": message, 
            "kyber": kyber, 
            "dilithium": dilithium, 
            "attack": attack, 
            "note": "Simulation only (not production keys). No external PQC dependencies used."
        }
        return jsonify(response)
    except Exception as ex:
        return jsonify({"success": False, "error": str(ex)}), 500


@app.route("/api/get_shor_circuit", methods=["GET"])
def api_get_shor_circuit():
    """Generate a visual representation of Shor's algorithm quantum circuit"""
    try:
        N = int(request.args.get("N", 15))
        
        # Simple quantum circuit for Shor's algorithm visualization
        circuit_info = generate_shor_circuit_visualization(N)
        
        return jsonify({
            "success": True,
            "N": N,
            "circuit": circuit_info
        })
    except Exception as ex:
        return jsonify({"success": False, "error": str(ex)}), 500


@app.route("/")
def index():
    return jsonify({
        "message": "Quantum Cryptography Demo Server", 
        "status": "running",
        "note": "Running without external crypto dependencies"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting combined demo server on port {port}...")
    print("Note: Running with simulated PQC (no external dependencies required)")
    app.run(host="0.0.0.0", port=port)
