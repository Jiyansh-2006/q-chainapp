// components/ZKPAttributeVerifier.tsx
import React, { useState } from 'react';
import { ZKPAttribute } from '../types/quantum.types';

interface ZKPAttributeVerifierProps {
  attributes: ZKPAttribute[];
  onVerify?: (attribute: ZKPAttribute) => void;
}

export const ZKPAttributeVerifier: React.FC<ZKPAttributeVerifierProps> = ({ 
  attributes, 
  onVerify 
}) => {
  const [expandedAttribute, setExpandedAttribute] = useState<string | null>(null);

  const getVerificationColor = (verified: boolean) => {
    return verified 
      ? 'border-green-500/30 bg-green-500/10' 
      : 'border-red-500/30 bg-red-500/10';
  };

  const getCircuitIcon = (circuitType?: string) => {
    switch (circuitType) {
      case 'merkle': return '🌲';
      case 'sha256': return '🔐';
      case 'pedersen': return '🔢';
      default: return '🔍';
    }
  };

  return (
    <div className="space-y-3">
      {attributes.map((attr, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${getVerificationColor(attr.verified)} transition-all hover:shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                attr.verified ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <span className={attr.verified ? 'text-green-400' : 'text-red-400'}>
                  {attr.verified ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">{attr.name}</span>
                  {attr.circuit_type && (
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full flex items-center">
                      <span className="mr-1">{getCircuitIcon(attr.circuit_type)}</span>
                      {attr.circuit_type}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Value: <span className="text-white font-mono">{attr.value}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setExpandedAttribute(expandedAttribute === attr.name ? null : attr.name)}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {expandedAttribute === attr.name ? 'Hide Proof' : 'View Proof'}
            </button>
          </div>

          {expandedAttribute === attr.name && (
            <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Proof ID:</span>
                  <span className="text-purple-400 font-mono">{attr.proof.substring(0, 32)}...</span>
                </div>
                {attr.public_inputs && (
                  <div>
                    <span className="text-gray-400">Public Inputs:</span>
                    <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto">
                      {JSON.stringify(attr.public_inputs, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Raw Proof:</span>
                  <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-500 text-[10px] overflow-x-auto">
                    {attr.proof}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};