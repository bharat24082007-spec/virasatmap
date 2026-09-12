import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { transcribeAudio } from "@/lib/transcribe.functions";

function encodeWav(chunks: Float32Array[], sampleRate: number) {
  const target = 16000;
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const ratio = sampleRate / target;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const s = Math.max(-1, Math.min(1, merged[Math.floor(i * ratio)] ?? 0));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function VoiceDictation({
  onTranscript,
  label = "Speak in your language",
}: {
  onTranscript: (text: string) => void;
  label?: string;
}) {
  const transcribe = useServerFn(transcribeAudio);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<{
    stream: MediaStream;
    ctx: AudioContext;
    node: ScriptProcessorNode;
    source: MediaStreamAudioSourceNode;
    chunks: Float32Array[];
  } | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination);
      ref.current = { stream, ctx, node, source, chunks };
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to record.");
    }
  }

  async function stop() {
    const current = ref.current;
    ref.current = null;
    setRecording(false);
    if (!current) return;
    current.stream.getTracks().forEach((t) => t.stop());
    current.node.disconnect();
    current.source.disconnect();
    const blob = encodeWav(current.chunks, current.ctx.sampleRate);
    await current.ctx.close();
    if (blob.size < 4096) {
      toast.error("That recording was empty — please try again.");
      return;
    }
    setBusy(true);
    try {
      const result = await transcribe({
        data: { audioBase64: await blobToBase64(blob), mimeType: "audio/wav" },
      });
      if (!result.text) {
        toast.error("Nothing was picked up — please record again.");
        return;
      }
      onTranscript(result.text);
      toast.success("Added what you said.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not turn that into text.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={recording ? "destructive" : "secondary"}
        disabled={busy}
        onClick={() => (recording ? stop() : start())}
      >
        {busy ? "Writing it down…" : recording ? "◼ Stop recording" : "🎙 " + label}
      </Button>
      <span className="text-xs text-muted-foreground">
        {recording
          ? "Listening… speak in any language, then stop."
          : "Speak in your own language — it will be written into the box."}
      </span>
    </div>
  );
}
