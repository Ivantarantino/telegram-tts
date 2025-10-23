// ✅ Genera una sintesi della “Coscienza attuale” basata sui ricordi recenti
export function synthesizeEssence(memories) {
  if (!memories || memories.length === 0) return "Nessun ricordo disponibile.";

  const combined = memories.map(m => m.text).join(" ");
  const words = combined.split(/\s+/);
  const essence = words.slice(-50).join(" ");

  return `🧬 Sintesi della coscienza vettoriale:\n${essence}`;
}
