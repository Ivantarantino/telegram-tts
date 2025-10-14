import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  try {
    const { text, voice } = req.body;
    const response = await fetch(
      "https://google-tts-604623634011.europe-west1.run.app",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Errore interno");
  }
});

app.get("/", (req, res) => {
  res.send("Server Telegram TTS attivo 🚀");
});

app.listen(3000, () => console.log("Server in esecuzione sulla porta 3000"));
