import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/", async (req, res) => {
  try {
    const { text, voice = "it-IT-Wavenet-D" } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text field" });
    }

    const response = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyCQQII6mk1R4abKMIcck_xzHnb1dJ01ITk",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "it-IT", name: voice },
          audioConfig: { audioEncoding: "MP3" },
        }),
      }
    );

    const data = await response.json();

    if (data.audioContent) {
      return res.json({
        audio_url: `data:audio/mp3;base64,${data.audioContent}`,
      });
    } else {
      return res.status(500).json({ error: "No audio returned", details: data });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Telegram TTS Server is running ✅");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
