import express from "express";
import { bootstrapTelegram } from "./adapters/telegram_bot.js";

const app = express();
app.use(express.json());

bootstrapTelegram(app);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌍 Server Express attivo su porta ${PORT}`);
});
