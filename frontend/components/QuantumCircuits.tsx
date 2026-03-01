import React, { useState, useEffect, useRef } from 'react';

interface QuantumGate {
  type: string;
  qubit: number;
  time: number;
  targets?: number[];
  control?: number;
  angle?: string;
  label?: string;
}

interface QuantumCircuitProps {
  circuit: {
    qubits: number;
    gates: QuantumGate[];
    steps: Array<{
      name: string;
      gates: QuantumGate[];
    }>;
    N?: number;
  };
  currentStep?: number;
  className?: string;
  isAnimating?: boolean;
}

const QuantumCircuits: React.FC<QuantumCircuitProps> = ({ 
  circuit, 
  currentStep = -1, 
  className = '',
  isAnimating = false 
}) => {
  const [animatedGates, setAnimatedGates] = useState<Set<string>>(new Set());
  const [hoveredGate, setHoveredGate] = useState<string | null>(null);
  const circuitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAnimating && currentStep >= 0) {
      // Animate gates for the current step
      const stepGates = circuit.steps[currentStep]?.gates || [];
      const newAnimatedGates = new Set<string>();
      
      stepGates.forEach((gate, index) => {
        setTimeout(() => {
          const gateId = `${gate.type}-${gate.qubit}-${gate.time}`;
          newAnimatedGates.add(gateId);
          setAnimatedGates(new Set(newAnimatedGates));
        }, index * 300);
      });
    } else {
      setAnimatedGates(new Set());
    }
  }, [currentStep, isAnimating, circuit.steps]);

  const getGateColor = (type: string): string => {
    switch (type) {
      case 'H': return 'bg-purple-500 hover:bg-purple-400';
      case 'X': return 'bg-red-500 hover:bg-red-400';
      case 'M': return 'bg-blue-500 hover:bg-blue-400';
      case 'U': return 'bg-green-500 hover:bg-green-400';
      case 'CR': return 'bg-orange-500 hover:bg-orange-400';
      default: return 'bg-gray-500 hover:bg-gray-400';
    }
  };

  const getGateSymbol = (type: string): string => {
    switch (type) {
      case 'H': return 'H';
      case 'X': return 'X';
      case 'M': return 'M';
      case 'U': return 'U';
      case 'CR': return 'R';
      default: return type;
    }
  };

  const getGateName = (type: string): string => {
    switch (type) {
      case 'H': return 'Hadamard';
      case 'X': return 'Pauli-X';
      case 'M': return 'Measurement';
      case 'U': return 'Modular Exponentiation';
      case 'CR': return 'Controlled Rotation';
      default: return 'Quantum Gate';
    }
  };

  const renderQubitLine = (qubitIndex: number) => {
    const maxTime = Math.max(...circuit.gates.map(g => g.time), 0);
    const isControlQubit = qubitIndex < circuit.qubits / 2;
    
    return (
      <div key={qubitIndex} className="flex items-center relative">
        {/* Qubit label */}
        <div className="w-16 text-right pr-3">
          <span className="text-slate-300 text-sm font-mono">
            {isControlQubit ? `|c${qubitIndex}⟩` : `|w${qubitIndex - Math.floor(circuit.qubits/2)}⟩`}
          </span>
        </div>
        
        {/* Qubit line */}
        <div 
          className="flex-1 h-0.5 bg-slate-600 relative"
          style={{ minWidth: `${(maxTime + 2) * 50}px` }}
        >
          {/* Timeline markers */}
          {Array.from({ length: maxTime + 2 }).map((_, timeIndex) => (
            <div
              key={timeIndex}
              className="absolute w-0.5 h-2 bg-slate-500 -top-1"
              style={{ left: `${timeIndex * 50}px` }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderGate = (gate: QuantumGate, index: number) => {
    const gateId = `${gate.type}-${gate.qubit}-${gate.time}`;
    const isActive = animatedGates.has(gateId);
    const isHovered = hoveredGate === gateId;

    return (
      <div
        key={index}
        className={`absolute transition-all duration-500 ${
          isActive ? 'z-20' : 'z-10'
        }`}
        style={{
          left: `${gate.time * 50 + 64}px`,
          top: `${gate.qubit * 48 + 8}px`,
        }}
        onMouseEnter={() => setHoveredGate(gateId)}
        onMouseLeave={() => setHoveredGate(null)}
      >
        {/* Gate element */}
        <div
          className={`
            relative w-8 h-8 rounded-lg flex items-center justify-center 
            text-white font-bold text-sm shadow-lg border-2 border-white/20
            ${getGateColor(gate.type)}
            ${isActive ? 'animate-pulse scale-110 ring-4 ring-yellow-400' : ''}
            ${isHovered ? 'scale-105 ring-2 ring-white' : ''}
            transition-all duration-300 cursor-help
          `}
          title={`${getGateName(gate.type)} on qubit ${gate.qubit}`}
        >
          {getGateSymbol(gate.type)}
          
          {/* Active animation glow */}
          {isActive && (
            <div className="absolute inset-0 rounded-lg bg-yellow-400 animate-ping opacity-30" />
          )}
        </div>

        {/* Control lines for controlled gates */}
        {gate.control !== undefined && (
          <>
            <div 
              className="absolute w-0.5 bg-slate-400 z-0 transition-all duration-500"
              style={{
                left: '14px',
                top: gate.control > gate.qubit ? '30px' : '-22px',
                height: `${Math.abs(gate.qubit - gate.control) * 48 - 16}px`,
              }}
            />
            <div 
              className={`absolute w-4 h-4 rounded-full border-2 border-slate-400 bg-white z-10 transition-all duration-300 ${
                isActive ? 'ring-2 ring-yellow-400 bg-yellow-100' : ''
              }`}
              style={{
                left: '12px',
                top: `${(gate.control - gate.qubit) * 48 - 8}px`,
              }}
            />
          </>
        )}

        {/* Gate label for modular exponentiation */}
        {gate.label && (isHovered || gate.type === 'U') && (
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 
                       bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap
                       border border-slate-600 shadow-lg z-30 transition-opacity duration-300"
          >
            {gate.label}
          </div>
        )}

        {/* Connection lines for multi-target gates */}
        {gate.targets && gate.targets.length > 0 && (
          <>
            {gate.targets.map((targetQubit, targetIndex) => (
              <div
                key={targetIndex}
                className="absolute w-0.5 bg-green-400/50 z-0 transition-all duration-500"
                style={{
                  left: '14px',
                  top: targetQubit > gate.qubit ? '30px' : '-22px',
                  height: `${Math.abs(gate.qubit - targetQubit) * 48 - 16}px`,
                }}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  const maxTime = Math.max(...circuit.gates.map(g => g.time), 0);
  const totalWidth = Math.max((maxTime + 2) * 50 + 64, 800);

  return (
    <div className={`bg-slate-900 rounded-lg p-6 ${className}`} ref={circuitRef}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Shor's Algorithm Quantum Circuit</h3>
          <p className="text-slate-400 text-sm">
            Factoring N = {circuit.N} | {circuit.qubits} qubits | {circuit.gates.length} gates
          </p>
        </div>
        
        {/* Circuit Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-slate-300">H</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-slate-300">U</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-slate-300">CR</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-slate-300">M</span>
          </div>
        </div>
      </div>

      {/* Circuit Visualization with Horizontal Scroll */}
      <div className="border-2 border-slate-700 rounded-lg p-6 bg-slate-800/50 overflow-x-auto">
        <div 
          className="relative min-h-64"
          style={{ width: `${totalWidth}px`, minWidth: '100%' }}
        >
          {/* Qubit lines */}
          <div className="space-y-8">
            {Array.from({ length: circuit.qubits }).map((_, i) => 
              renderQubitLine(i)
            )}
          </div>
          
          {/* Render all gates */}
          {circuit.gates.map((gate, index) => renderGate(gate, index))}

          {/* Step separators */}
          {circuit.steps.map((step, stepIndex) => {
            const stepGates = step.gates;
            if (stepGates.length === 0) return null;
            
            const minTime = Math.min(...stepGates.map(g => g.time));
            return (
              <div
                key={stepIndex}
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/30"
                style={{ left: `${minTime * 50 + 40}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="mt-2 text-center">
        <div className="inline-flex items-center gap-2 text-slate-400 text-sm bg-slate-800 px-3 py-1 rounded-full">
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
          </svg>
          Scroll horizontally to view the full circuit
        </div>
      </div>

      {/* Algorithm Steps Progress */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold text-white mb-4">Algorithm Execution Steps</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {circuit.steps.map((step, index) => (
            <div
              key={index}
              className={`
                p-4 rounded-xl border-2 transition-all duration-500 transform
                ${
                  currentStep === index 
                    ? 'border-yellow-400 bg-yellow-400/10 scale-105 shadow-lg' 
                    : currentStep > index
                    ? 'border-green-400 bg-green-400/5'
                    : 'border-slate-600 bg-slate-800'
                }
                hover:scale-102 cursor-default
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    currentStep === index 
                      ? 'bg-yellow-400 text-black animate-pulse' 
                      : currentStep > index
                      ? 'bg-green-400 text-black'
                      : 'bg-slate-600 text-slate-300'
                  }
                  transition-all duration-300
                `}>
                  {index + 1}
                </div>
                <span className="text-white font-semibold">{step.name}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {step.name === 'Superposition' && 'Apply Hadamard gates to create superposition'}
                {step.name === 'Modular Exponentiation' && 'Compute modular exponentiation quantumly'}
                {step.name === 'Inverse QFT' && 'Apply inverse Quantum Fourier Transform'}
                {step.name === 'Measurement' && 'Measure the quantum register'}
              </p>
              <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                <span>{step.gates.length} gates</span>
                {currentStep === index && (
                  <span className="text-yellow-400 animate-pulse">Executing...</span>
                )}
                {currentStep > index && (
                  <span className="text-green-400">✓ Complete</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Circuit Explanation */}
      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <h5 className="text-white font-semibold mb-2">Circuit Explanation:</h5>
        <div className="text-slate-400 text-sm space-y-1">
          <p>• <strong>Control Register (|c⟩):</strong> Upper qubits used for period finding</p>
          <p>• <strong>Work Register (|w⟩):</strong> Lower qubits store computational results</p>
          <p>• <strong>Modular Exponentiation (U):</strong> Quantum computation of a^x mod N</p>
          <p>• <strong>Inverse QFT:</strong> Extracts period information from phase</p>
        </div>
      </div>
    </div>
  );
};

export default QuantumCircuits;