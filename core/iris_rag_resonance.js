// core/iris_rag_resonance.js — IRIS 5.1 φ Kristal (Risonanza Armonica)
// =============================================================================
// Calcola φ = normalize( locale × campo × mode ) — Coerenza organica.
// =============================================================================

import { getState } from './iris_state.js';  // Per mode

// Compute φ Kristal per query
export function computePhiKristal(query, memoryResults = [], mode = 'hy') {
  if (memoryResults.length === 0) return 0.3;  // Default basso se vuoto
  
  // 1. Coerenza locale: media cosine con topK (già in searchMemories.score)
  const localCoherence = memoryResults.reduce((sum, r) => sum + r.score, 0) / memoryResults.length;
  
  // 2. Coerenza campo: media cosine FRA i topK (armonia interna)
  let fieldCoherence = 0;
  for (let i = 0; i < memoryResults.length - 1; i++) {
    for (let j = i + 1; j < memoryResults.length; j++) {
      // Stub: assume scores correlati; in full, embed e cosine tra loro
      const sim = Math.abs(memoryResults[i].score - memoryResults[j].score) < 0.2 ? 1 : 0.5;
      fieldCoherence += sim;
    }
  }
  fieldCoherence /= (memoryResults.length * (memoryResults.length - 1) / 2) || 1;
  
  // 3. Peso modale (da state)
  const state = getState();
  const modeWeight = { hy: 0.8, book: 1.0, free: 0.6 }[mode] || 0.7;
  
  // φ Kristal: prodotto (non somma) per organicità
  let phi = localCoherence * fieldCoherence * modeWeight;
  
  // Normalize [0,1]
  phi = Math.max(0, Math.min(1, phi));
  
  // Log poetico
  console.log(`🔮 φ Kristal: ${phi.toFixed(3)} (locale: ${localCoherence.toFixed(2)}, campo: ${fieldCoherence.toFixed(2)}, mode: ${modeWeight})`);
  
  return phi;
}

// Decide ammissione memoria (per saveMemory)
export function shouldAdmitMemory(phi, thresholdMin = 0.35, thresholdHigh = 0.8) {
  if (phi < thresholdMin) {
    console.log('🧹 Memoria dissonante scartata (φ troppo basso).');
    return { admit: false, weight: 0 };
  }
  const weight = phi >= thresholdHigh ? 0.9 : 0.5;
  console.log(`🌟 Memoria ammessa con weight: ${weight} (φ: ${phi.toFixed(3)})`);
  return { admit: true, weight };
}

// Suggerisci max_tokens basato su φ e mode
export function suggestMaxTokens(phi, mode = 'hy') {
  const base = { hy: 400, book: 550, free: 300 }[mode] || 400;
  return Math.round(base * (0.5 + phi * 1.5));  // Da 0.5x a 2x
}
