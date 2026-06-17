// telegramSetCommands.js
// Script manuale per aggiornare il menu nativo Telegram dei comandi IRIS.
// Non importa index.js, non avvia Express, non cambia webhook.

import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const commands = [
  {
    command: "start",
    description: "Avvia o riapre il dialogo con IRIS"
  },
  {
    command: "help",
    description: "Mostra il menu dei comandi"
  },
  {
    command: "free",
    description: "Modalità libera, senza Biblioteca"
  },
  {
    command: "book",
    description: "Modalità Biblioteca"
  },
  {
    command: "hy",
    description: "Modalità ibrida"
  },
  {
    command: "essence",
    description: "Mostra l’Essenza Kristal"
  },
  {
    command: "state",
    description: "Mostra lo stato operativo di IRIS"
  },
  {
    command: "kristal",
    description: "Mostra le ultime memorie Kristal"
  },
  {
    command: "dream",
    description: "Crea un dialogo narrativo/audio"
  },
  {
    command: "dreamdialect",
    description: "Scegli il dialetto di Dream"
  },
  {
    command: "dreamstyle",
    description: "Scegli lo stile di Dream"
  }
];

async function main() {
  if (!TELEGRAM_TOKEN) {
    console.error("Errore: TELEGRAM_TOKEN mancante nell'ambiente.");
    process.exitCode = 1;
    return;
  }

  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

  try {
    await bot.setMyCommands(commands);

    console.log("Menu nativo Telegram aggiornato.");
    console.log("Comandi impostati:");
    for (const item of commands) {
      console.log(`/${item.command} — ${item.description}`);
    }
  } catch (error) {
    console.error("Errore durante setMyCommands:");
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}

main();
