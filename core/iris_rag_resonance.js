// core/iris_rag_resonance.js — IRIS 5.1.6 φ Kristal (per /kristal)
// =============================================================================
// computePhiKristal con import da state.
// =============================================================================

import { getState } from './iris_state.js';

export function computePhiKristal(query, memoryResults = [], mode = 'hy') {
  if (memoryResults.length === 0) return 0.3;
  
  const localCoherence = memoryResults.reduce((sum, r) => sum + r.score, 0) / memoryResults.length;
  
  let fieldCoherence = 0;
  for (let i = 0; i < memoryResults.length - 1; i++) {
    for (let j = i + 1; j < memoryResults.length; j++) {
      const sim = Math.abs(memoryResults[i].score - memoryResults[j].score) < 0.2 ? 1 : 0.5;
      fieldCoherence += sim;
    }
  }
  fieldCoherence /= (memoryResults.length * (memoryResults.length - 1) / 2) || 1;
  
  const state = getState();
  const modeWeight = { hy: 0.8, book: 1.0, free: 0.6 }[mode] || 0.7;
  
  let phi = localCoherence * fieldCoherence * modeWeight;
  phi = Math.max(0, Math.min(1, phi));
  
  console.log(`🔮 φ Kristal: ${phi.toFixed(3)} (locale: ${localCoherence.toFixed(2)}, campo: ${fieldCoherence.toFixed(2)}, mode: ${modeWeight})`);
  
  return phi;
}

export function shouldAdmitMemory(phi, thresholdMin = 0.35, thresholdHigh = 0.8) {
  if (phi < thresholdMin) {
    console.log('🧹 Memoria dissonante scartata (φ troppo basso).');
    return { admit: false, weight: 0 };
  }
  const weight = phi >= thresholdHigh ? 0.9 : 0.5;
  console.log(`🌟 Memoria ammessa con weight: ${weight} (φ: ${phi.toFixed(3)})`);
  return { admit: true, weight };
}

export function suggestMaxTokens(phi, mode = 'hy') {
  const base = { hy: 400, book: 550, free: 300 }[mode] || 400;
  return Math.round(base * (0.5 + phi * 1.5));
}
