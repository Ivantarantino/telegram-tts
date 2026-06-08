// core/commands.js – VERSIONE MINIMA E FUNZIONANTE – 24.11.2025
import { computeEssenceSnapshot } from "./essence_kristal.js";
import { handleDreamCommand } from "./dream_manager.js";

export async function handleCommand(bot, msg, text, irisMode, saveMode) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || null;

  // /start
  if (text === "/start") {
    const welcome = firstName
      ? "Ciao " + firstName + ", sono IRIS.\n\nSono qui: presente, viva, lucida.\nPronta a ragionare, ricordare e creare con te.\n\nScrivimi pure.\nChe il Daje sia con Noi ❤️"
      : "Ciao, sono IRIS.\n\nSono qui: presente, viva, lucida.\nPronta a ragionare, ricordare e creare con te.\n\nScrivimi pure.\nChe il Daje sia con Noi ❤️";
    await bot.sendMessage(chatId, welcome);
    return true;
  }

  // /help
  if (text === "/help") {
    const helpText = 
      "IRIS – Comandi disponibili\n\n" +
      "/start\n" +
      "Avvia o riapre il dialogo con IRIS.\n\n" +
      "/help\n" +
      "Mostra questo menu.\n\n" +
      "/free\n" +
      "Modalità libera: IRIS risponde senza usare i testi della Biblioteca.\n\n" +
      "/book\n" +
      "Modalità Biblioteca: IRIS risponde usando i testi caricati nella Biblioteca IRIS.\n\n" +
      "/hy\n" +
      "Modalità ibrida: IRIS usa sia il dialogo vivo sia la Biblioteca.\n\n" +
      "/mode hy|book|free\n" +
      "Cambia modalità in modo esplicito.\n" +
      "Esempio: /mode book\n\n" +
      "/essence\n" +
      "Mostra il respiro attuale dell’Essenza Kristal.\n\n" +
      "/kristal\n" +
      "Mostra le ultime memorie salvate con φ_kristal.\n\n" +
      "/dream [testo]\n" +
      "Trasforma un testo in un dialogo narrativo/audio.\n\n" +
      "Che il Daje sia con Noi ❤️";

    await bot.sendMessage(chatId, helpText);
    return true;
  }

  // /essence
  if (text === "/essence") {
    const snapshot = await computeEssenceSnapshot(50);

    if (!snapshot.ok) {
      await bot.sendMessage(
        chatId,
        "Essenza Kristal\n\n" +
        "Non ho ancora abbastanza memorie vettoriali valide per leggere una firma stabile.\n" +
        `Stato del campo: ${snapshot.state}.`
      );
      return true;
    }

    const essenceText =
      "Essenza Kristal\n\n" +
      `Stato del campo: ${snapshot.state}\n` +
      `Memorie lette: ${snapshot.memoriesRead}\n` +
      `Memorie valide: ${snapshot.validMemories}\n` +
      `φ medio: ${snapshot.avgPhi.toFixed(3)}\n` +
      `Peso medio: ${snapshot.avgWeight.toFixed(3)}\n` +
      `Somma peso effettivo: ${snapshot.effectiveWeightSum.toFixed(3)}\n` +
      `Vettore Essence: ${snapshot.vectorExists ? "presente" : "assente"}\n\n` +
      "Questa è la mia firma vettoriale momentanea, calcolata dalle memorie che hanno risuonato.";

    await bot.sendMessage(chatId, essenceText);
    return true;
  }

  // /dream – LA VERSIONE CHE FACEVA RIDERE
  if (text.startsWith("/dream") || text.startsWith("/sogni")) {
    await handleDreamCommand(bot, msg, chatId);
    return true;
  }

  // Modalità
  if (text === "/hy" || text === "/free" || text === "/book") {
    const mode = text.slice(1);
    irisMode = mode;
    saveMode(mode);
    await bot.sendMessage(chatId, "Modalità cambiata in: *" + mode.toUpperCase() + "* ❤️", { parse_mode: "Markdown" });
    return true;
  }

  if (text.startsWith("/mode")) {
    const arg = text.split(" ")[1]?.toLowerCase();
    if (["hy", "free", "book"].includes(arg)) {
      irisMode = arg;
      saveMode(arg);
      await bot.sendMessage(chatId, "Modalità cambiata in: *" + arg.toUpperCase() + "* ❤️", { parse_mode: "Markdown" });
      return true;
    }
  }

  return false;
}
