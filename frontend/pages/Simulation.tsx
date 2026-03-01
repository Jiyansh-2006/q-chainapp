import React, { useRef, useState } from "react";
import axios from "axios";
import Card from "../components/Card";
import QuantumCircuit from "../components/QuantumCircuits";

type ResultShape = {
  success?: boolean;
  method?: string;
  N?: number | string;
  p_found?: number | string;
  q_found?: number | string;
  recovered_text?: string;
  error?: string;
  [k: string]: any;
};

type PQCResultShape = {
  success?: boolean;
  kyber?: any;
  dilithium?: any;
  attack?: any;
  error?: string;
  [k: string]: any;
};

const RSA2048_NOTE = `Demo note: factoring a real 2048-bit RSA modulus is infeasible in this demo. This option simulates the attempted attack and then reports that RSA-2048 remains secure.`;

const Simulation: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [rsaProgress, setRsaProgress] = useState(0);
  const [pqcStatus, setPqcStatus] = useState<"secure" | "attacked">("secure");
  const [result, setResult] = useState<ResultShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PQC
  const [isPqcSimulating, setIsPqcSimulating] = useState(false);
  const [pqcProgress, setPqcProgress] = useState(0);
  const [pqcResult, setPqcResult] = useState<PQCResultShape | null>(null);
  const pqcIntervalRef = useRef<number | null>(null);

  // Quantum Circuit
  const [quantumCircuit, setQuantumCircuit] = useState<any>(null);
  const [circuitStep, setCircuitStep] = useState(-1);
  const [showCircuit, setShowCircuit] = useState(false);
  const [isCircuitAnimating, setIsCircuitAnimating] = useState(false);

  // inputs
  const [pInput, setPInput] = useState<string>("3");
  const [qInput, setQInput] = useState<string>("5");
  const [messageInput, setMessageInput] = useState<string>("A");

  // preset selector
  const [preset, setPreset] = useState<"fast" | "medium" | "slow" | "rsa2048">("fast");

  // interval ref for RSA progress
  const progressIntervalRef = useRef<number | null>(null);

  const startProgress = (holdBelow100 = true) => {
    setRsaProgress(0);
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    progressIntervalRef.current = window.setInterval(() => {
      setRsaProgress((prev) => {
        if (!holdBelow100 && prev >= 100) return prev;
        if (holdBelow100 && prev >= 99) return prev;
        return Math.min(prev + Math.random() * 8 + 2, holdBelow100 ? 99 : 100);
      });
    }, 160);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startPqcProgress = () => {
    setPqcProgress(0);
    if (pqcIntervalRef.current) {
      window.clearInterval(pqcIntervalRef.current);
      pqcIntervalRef.current = null;
    }
    pqcIntervalRef.current = window.setInterval(() => {
      setPqcProgress((prev) => Math.min(prev + Math.random() * 6 + 1, 100));
    }, 220);
  };

  const stopPqcProgress = () => {
    if (pqcIntervalRef.current) {
      window.clearInterval(pqcIntervalRef.current);
      pqcIntervalRef.current = null;
    }
  };

  const copyToClipboard = async (text?: string | number) => {
    if (text === undefined) return;
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      // ignore
    }
  };

  const applyPreset = (p: "fast" | "medium" | "slow" | "rsa2048") => {
    setPreset(p);
    setResult(null);
    setError(null);
    setShowCircuit(false);
    setCircuitStep(-1);
    setIsCircuitAnimating(false);

    switch (p) {
      case "fast":
        setPInput("3");
        setQInput("5");
        setMessageInput("A");
        break;
      case "medium":
        setPInput("11");
        setQInput("13");
        setMessageInput("A");
        break;
      case "slow":
        setPInput("");
        setQInput("");
        setMessageInput("A");
        break;
      case "rsa2048":
        setPInput("");
        setQInput("");
        setMessageInput("A");
        break;
    }
  };

  const validateInputs = () => {
    if (messageInput.length > 512) return "Message too long (limit 512 chars)";
    if (pInput && isNaN(Number(pInput))) return "p must be a number";
    if (qInput && isNaN(Number(qInput))) return "q must be a number";
    return null;
  };

  const fetchQuantumCircuit = async (N: number) => {
    try {
      const response = await axios.get("https://vibrant-analysis-production.up.railway.app/api/get_shor_circuit", {
        params: { N }
      });
      if (response.data.success) {
        setQuantumCircuit(response.data.circuit);
        setShowCircuit(true);
      }
    } catch (error) {
      console.error("Failed to fetch quantum circuit:", error);
    }
  };

  const animateCircuit = async () => {
    setIsCircuitAnimating(true);
    setCircuitStep(-1);
    
    // Brief pause before starting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Animate through each step with proper timing
    for (let step = 0; step < 4; step++) {
      setCircuitStep(step);
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 seconds per step
    }
    
    // Final pause at completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsCircuitAnimating(false);
  };

  const resetCircuit = () => {
    setCircuitStep(-1);
    setIsCircuitAnimating(false);
    setShowCircuit(false);
    setQuantumCircuit(null);
  };

  // Main RSA/Shor simulation handler
  const handleSimulate = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setResult(null);
    setPqcStatus("secure");
    setIsSimulating(true);
    setShowCircuit(false);
    setCircuitStep(-1);
    setIsCircuitAnimating(false);

    if (preset === "rsa2048") {
      startProgress(true);
      setTimeout(() => {
        setRsaProgress(45 + Math.random() * 30);
      }, 700);

      setTimeout(() => {
        stopProgress();
        setRsaProgress(0);
        setIsSimulating(false);
        setPqcStatus("secure");
        setResult({
          success: false,
          method: "simulated",
          N: "2048-bit modulus (not shown)",
          p_found: undefined,
          q_found: undefined,
          recovered_text: undefined,
          error: "RSA-2048 factoring infeasible in this demo. Production RSA remains secure.",
        });
      }, 3000 + Math.random() * 2000);

      return;
    }

    startProgress(true);

    const params: Record<string, string | number> = { message: messageInput || "A" };
    if (pInput) params.p = Number(pInput);
    if (qInput) params.q = Number(qInput);

    try {
      const resp = await axios.get<ResultShape>("https://vibrant-analysis-production.up.railway.app/api/simulate_shor", {
        params,
        timeout: 60_000,
      });

      setResult(resp.data);

      // Fetch and show quantum circuit
      if (resp.data.N) {
        fetchQuantumCircuit(Number(resp.data.N));
        // Start animation after a brief delay
        setTimeout(() => {
          animateCircuit();
        }, 500);
      }

      if (resp.data.success) setPqcStatus("attacked");
      else {
        if (resp.data.p_found || resp.data.q_found) setPqcStatus("attacked");
        else setPqcStatus("secure");
      }

      stopProgress();
      setRsaProgress(100);
    } catch (err: any) {
      stopProgress();
      setRsaProgress(0);
      const msg = err?.response?.data?.error ?? err?.message ?? "Unknown error";
      setError(String(msg));
      setPqcStatus("secure");
    } finally {
      setTimeout(() => setIsSimulating(false), 600);
    }
  };

  // PQC simulation handler
  const handleSimulatePQC = async () => {
    setPqcResult(null);
    setError(null);
    setIsPqcSimulating(true);
    setPqcProgress(0);
    startPqcProgress();

    const params: Record<string, string | number> = { message: messageInput || "A" };

    try {
      const resp = await axios.get<PQCResultShape>("https://vibrant-analysis-production.up.railway.app/api/simulate_pqc", {
        params,
        timeout: 60_000,
      });

      stopPqcProgress();
      setPqcProgress(100);
      setPqcResult(resp.data);

      if (resp.data.attack?.success) {
        setPqcStatus("attacked");
      } else {
        setPqcStatus("secure");
      }
    } catch (err: any) {
      stopPqcProgress();
      setPqcProgress(0);
      const msg = err?.response?.data?.error ?? err?.message ?? "Unknown error";
      setError(String(msg));
    } finally {
      setTimeout(() => setIsPqcSimulating(false), 600);
    }
  };

  // initial apply preset on first render
  React.useEffect(() => {
    applyPreset("fast");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Quantum Attack Simulation (Interactive)</h1>

      <Card title="Shor's Algorithm Demo">
        <div className="grid gap-6">
          {/* Preset and Inputs Section - ALWAYS VISIBLE */}
          <div className="p-4 bg-dark-bg border border-dark-border rounded-lg space-y-4 overflow-x-auto">
            {/* Preset */}
            <div className="flex items-center gap-4 min-w-max">
              <label className="text-slate-300">Preset:</label>
              <select
                value={preset}
                onChange={(e) => applyPreset(e.target.value as any)}
                className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700"
                disabled={isSimulating || isPqcSimulating}
              >
                <option value="fast">Fast (toy primes)</option>
                <option value="medium">Medium (demo primes)</option>
                <option value="slow">Slow (let backend pick larger primes)</option>
                <option value="rsa2048">RSA-2048 (show infeasible / secure)</option>
              </select>

              <div className="text-sm text-slate-400">{preset === "rsa2048" ? RSA2048_NOTE : "Use presets to quickly set primes & message."}</div>
            </div>

            {/* Inputs */}
            <div className="grid md:grid-cols-3 gap-4 min-w-max">
              <div>
                <label className="block text-slate-300 mb-1">p (prime) — leave blank for auto</label>
                <input
                  value={pInput}
                  onChange={(e) => setPInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-slate-800 text-white border border-slate-700"
                  placeholder="e.g. 3"
                  disabled={isSimulating || preset === "rsa2048"}
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">q (prime) — leave blank for auto</label>
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-slate-800 text-white border border-slate-700"
                  placeholder="e.g. 5"
                  disabled={isSimulating || preset === "rsa2048"}
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Message (short)</label>
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-slate-800 text-white border border-slate-700"
                  placeholder="A"
                  disabled={isSimulating || isPqcSimulating}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 min-w-max">
              <button
                onClick={handleSimulate}
                disabled={isSimulating || isPqcSimulating}
                className="px-5 py-2 bg-gradient-to-r from-red-500 to-yellow-500 text-white font-bold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSimulating ? "Simulating..." : "Run RSA/Shor Simulation"}
              </button>

              <button
                onClick={handleSimulatePQC}
                disabled={isPqcSimulating || isSimulating}
                className="px-5 py-2 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPqcSimulating ? "Simulating PQC..." : "Simulate PQC (Kyber/Dilithium)"}
              </button>

              <div className="text-sm text-slate-400">
                <strong>Tip:</strong> Use <em>Fast</em> for toy demos. Use <em>RSA-2048</em> to show real-world RSA remains secure. Use the PQC button to demonstrate post-quantum resistance.
              </div>
            </div>
          </div>

          {/* Quantum Circuit Section with PROPER Horizontal Scroll */}
          {showCircuit && quantumCircuit && (
            <div className="p-4 bg-dark-bg border border-dark-border rounded-lg overflow-x-auto">
              <div className="flex justify-between items-center mb-4 min-w-max">
                <h3 className="text-xl font-bold text-purple-400">Live Quantum Circuit</h3>
                <div className="flex gap-2">
                  <button
                    onClick={animateCircuit}
                    disabled={isCircuitAnimating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCircuitAnimating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Animating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play Animation
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetCircuit}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Reset Circuit
                  </button>
                </div>
              </div>
              
              {/* PROPER Horizontal Scroll Container */}
              <div className="w-full overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <div className="inline-block min-w-full p-4">
                  <QuantumCircuit 
                    circuit={quantumCircuit} 
                    currentStep={circuitStep}
                    isAnimating={isCircuitAnimating}
                  />
                </div>
              </div>
              
              <div className="mt-4 text-slate-400 text-sm min-w-max">
                <p className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  <span>Yellow highlight shows currently executing gates</span>
                </p>
                <p className="text-xs">
                  The circuit demonstrates Shor's algorithm factoring N={quantumCircuit.N} using {quantumCircuit.qubits} qubits
                </p>
                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                  </svg>
                  <strong>Tip:</strong> Scroll horizontally to view the entire circuit
                </p>
              </div>
            </div>
          )}

          {/* RSA Progress / results - ALWAYS VISIBLE */}
          <div className="p-4 bg-dark-bg border border-dark-border rounded-lg overflow-x-auto">
            <div className="flex items-center justify-between mb-2 min-w-max">
              <h3 className="text-lg font-semibold text-red-400">Standard RSA Encryption</h3>
              <div className="text-sm text-slate-300">{isSimulating ? "Simulating..." : rsaProgress >= 100 ? "COMPROMISED" : "Idle"}</div>
            </div>

            <div className="relative h-12 w-full bg-slate-700 rounded-full overflow-hidden border-2 border-red-500/50 min-w-max">
              <div
                className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-300 ease-linear"
                style={{ width: `${rsaProgress}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                {rsaProgress < 100 ? `Cracking... ${Math.round(rsaProgress)}%` : "COMPROMISED"}
              </span>
            </div>

            <div className="mt-4 min-w-max">
              {isSimulating && rsaProgress < 100 && <p className="text-yellow-400">Quantum attack in progress...</p>}
              {rsaProgress >= 100 && <p className="text-red-400 font-bold">Private Key Exposed!</p>}
            </div>

            <div className="mt-4 text-left text-slate-300 space-y-1 min-w-max">
              <div><strong>Method:</strong> {result?.method ?? (preset === "rsa2048" ? "simulated" : "unknown")}</div>
              <div><strong>N:</strong> {result?.N ?? "-"}</div>
              <div className="flex items-center gap-2">
                <strong>p found:</strong>
                <span>{result?.p_found ?? "-"}</span>
                {result?.p_found && (
                  <button onClick={() => copyToClipboard(result.p_found)} className="ml-2 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors">Copy</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <strong>q found:</strong>
                <span>{result?.q_found ?? "-"}</span>
                {result?.q_found && (
                  <button onClick={() => copyToClipboard(result.q_found)} className="ml-2 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors">Copy</button>
                )}
              </div>
              <div className="flex items-start gap-2">
                <strong>Recovered text:</strong>
                <div className="max-w-xl break-words">{result?.recovered_text ?? "-"}</div>
                {result?.recovered_text && (
                  <button onClick={() => copyToClipboard(result.recovered_text)} className="ml-2 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors">Copy</button>
                )}
              </div>
            </div>

            <div className="mt-4 min-w-max">
              {error && <div className="text-red-400 font-bold">Error: {error}</div>}
              {!error && !result && !isSimulating && (
                <div className="text-slate-400">Press <strong>Run RSA/Shor Simulation</strong> to begin.</div>
              )}
              {result && (
                <div className="mt-3 text-xs text-slate-400 overflow-x-auto">
                  <div><strong>Raw backend output (inspect):</strong></div>
                  <pre className="text-xs bg-slate-900 p-2 rounded mt-1 overflow-auto max-h-36 min-w-max">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* PQC block - ALWAYS VISIBLE */}
          <div className="p-4 bg-dark-bg border border-dark-border rounded-lg overflow-x-auto">
            <h3 className="text-lg font-semibold text-green-400 min-w-max">PQC (Kyber / Dilithium) Simulation</h3>

            <div className={`relative h-12 w-full bg-slate-700 rounded-full flex items-center justify-center border-2 ${pqcStatus === "secure" ? "border-green-500/50" : "border-red-500/50"} min-w-max`}>
              {pqcStatus === "attacked" ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white bg-red-500/50">ATTACK SUCCESS (PQC)</div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span className="text-lg font-bold text-white">PQC SECURED</span>
                </div>
              )}
            </div>

            <div className="mt-4 min-w-max">
              <div className="relative h-10 w-full bg-slate-700 rounded-full overflow-hidden border-2 border-green-500/30">
                <div className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300 ease-linear" style={{ width: `${pqcProgress}%` }} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
                  {isPqcSimulating ? `Evaluating PQC... ${Math.round(pqcProgress)}%` : pqcProgress >= 100 ? "EVALUATION COMPLETE" : "Idle"}
                </span>
              </div>
            </div>

            <div className="mt-4 text-slate-300 space-y-2 min-w-max">
              <div><strong>Kyber (KEM) public key:</strong> 
                <div className="overflow-x-auto mt-1">
                  <span className="break-all bg-slate-800 px-2 py-1 rounded text-sm font-mono">{pqcResult?.kyber?.public_key ?? "-"}</span>
                </div>
              </div>
              <div><strong>Kyber decapsulated secret match:</strong> <span>{pqcResult?.kyber?.shared_match ?? (pqcResult?.kyber?.decapsulated ? "Yes" : "-")}</span></div>
              <div><strong>Dilithium (Signature) verified:</strong> <span>{typeof pqcResult?.dilithium?.verified === "boolean" ? (pqcResult!.dilithium!.verified ? "Yes" : "No") : "-"}</span></div>
              <div><strong>Attack outcome:</strong> <span>{pqcResult?.attack ? (pqcResult.attack.success ? "Attack succeeded (unexpected)" : "Attack failed — PQC holds") : "-"}</span></div>

              {pqcResult && (
                <div className="mt-3 text-xs text-slate-400 overflow-x-auto">
                  <div><strong>PQC backend output (inspect):</strong></div>
                  <pre className="text-xs bg-slate-900 p-2 rounded mt-1 overflow-auto max-h-40 min-w-max">{JSON.stringify(pqcResult, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="mt-4 min-w-max">
              {error && <div className="text-red-400 font-bold">Error: {error}</div>}
              {!error && !pqcResult && !isPqcSimulating && (
                <div className="text-slate-400">Press <strong>Simulate PQC (Kyber/Dilithium)</strong> to begin.</div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Simulation;
