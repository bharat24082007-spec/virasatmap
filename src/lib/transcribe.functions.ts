import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  audioBase64: z.string().min(100),
  mimeType: z.string().default("audio/wav"),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Voice transcription is not configured.");

    const binary = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    if (binary.byteLength < 2048) {
      throw new Error("That recording was too short — please try again.");
    }

    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append(
      "file",
      new Blob([binary as unknown as BlobPart], { type: data.mimeType }),
      "recording.wav",
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) throw new Error("Too many requests just now — try again shortly.");
      if (response.status === 402) throw new Error("Voice credits are exhausted for this workspace.");
      throw new Error(detail || `Transcription failed (${response.status}).`);
    }

    const json = (await response.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });
