// src/utils/ethereum.ts
export const getEthereum = (): any | null => {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
};
