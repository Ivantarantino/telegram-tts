// =========================================
// ESSENCE – IRIS 3.8.7
// Calcola la "firma vibrazionale" dell’esperienza
// =========================================

// 🔹 Calcola la media ponderata dei vettori
export function calcolaEssenza(embeddings, pesi) {
  if (embeddings.length !== pesi.length) {
    throw new Error("Numero di embeddings e pesi non corrispondono.");
  }

  const dimensione = embeddings[0].length;
  const sommaPonderata = new Array(dimensione).fill(0);
  let sommaPesi = 0;

  for (let i = 0; i < embeddings.length; i++) {
    const emb = embeddings[i];
    const peso = pesi[i];
    sommaPesi += peso;
    for (let j = 0; j < dimensione; j++) {
      sommaPonderata[j] += emb[j] * peso;
    }
  }

  const essence = sommaPonderata.map(x => x / sommaPesi);
  return essence;
}

// 🔹 Esempio di uso
export function esempioEssenza() {
  const embeddings = [
    [0.2, 0.8, 0.4, 0.1],
    [0.9, 0.1, 0.3, 0.2],
    [0.4, 0.5, 0.9, 0.7],
  ];
  const pesi = [0.6, 0.3, 0.9];
  const essence = calcolaEssenza(embeddings, pesi);
  console.log("🌐 ESSENCE:", essence.map(x => x.toFixed(3)));
  return essence;
}
