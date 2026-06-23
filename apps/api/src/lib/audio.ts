import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { logger } from "./logger";

export async function transcribeAudioBase64(
  base64: string,
  mimetype?: string
): Promise<string | null> {
  if (!base64) return null;

  const ext = (mimetype ?? "").includes("mp4") || (mimetype ?? "").includes("mpeg") ? ".mp4"
    : (mimetype ?? "").includes("webm") ? ".webm"
    : ".ogg";
  const tempPath = path.join(os.tmpdir(), `audio_${crypto.randomUUID()}${ext}`);

  try {
    fs.writeFileSync(tempPath, Buffer.from(base64, "base64"));

    // 1️⃣ Try Groq Whisper Large v3 (preferred — faster & free)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const { default: Groq } = await import("groq-sdk");
        const groq = new Groq({ apiKey: groqKey });
        const result = await groq.audio.transcriptions.create({
          file: fs.createReadStream(tempPath),
          model: "whisper-large-v3",
          response_format: "json",
          temperature: 0,
        });
        const text = result.text?.trim();
        if (text) {
          logger.debug("[audio] Groq Whisper transcription OK");
          return text;
        }
      } catch (err) {
        logger.warn({ err }, "[audio] Groq Whisper failed — trying OpenAI fallback");
      }
    }

    // 2️⃣ Fallback: OpenAI Whisper-1 API
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const audioBuffer = fs.readFileSync(tempPath);
        const blob = new Blob([audioBuffer], { type: mimetype ?? "audio/ogg" });
        const formData = new FormData();
        formData.append("file", blob, `audio${ext}`);
        formData.append("model", "whisper-1");
        formData.append("response_format", "json");

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const data = (await res.json()) as { text?: string };
          const text = data.text?.trim();
          if (text) {
            logger.debug("[audio] OpenAI Whisper-1 transcription OK");
            return text;
          }
        } else {
          logger.warn({ status: res.status }, "[audio] OpenAI Whisper-1 returned error");
        }
      } catch (err) {
        logger.warn({ err }, "[audio] OpenAI Whisper-1 fallback failed");
      }
    }

    if (!groqKey && !openaiKey) {
      logger.debug("[audio] No GROQ_API_KEY or OPENAI_API_KEY configured — skipping transcription");
    }

    return null;
  } finally {
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
  }
}
