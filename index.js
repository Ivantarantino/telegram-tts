import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import util from "util";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new textToSpeech.TextToSpeechClient();

app.post("/", async (req, res) => {
  try {
    const text = req.body.text || "Ciao dal server TTS!";
    const voice = req.body.voice || "it-IT-Wavenet-D";

    const request = {
      input: { text },
      voice: { languageCode: "it-IT", name: voice },
      audioConfig: { audioEncoding: "MP3" },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audioBase64 = response.audioContent.toString("base64");

    res.status(200).json({
      audio_url: `data:audio/mp3;base64,${audioBase64}`,
    });
  } catch (error) {
    console.error("Errore TTS:", error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ Server TTS attivo su porta ${port}`));
