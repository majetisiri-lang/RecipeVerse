"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Loader2, AlertCircle, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceApiResponse } from "@/types/voice";

type RecorderState = "idle" | "recording" | "processing" | "done" | "error";
type Mode = "voice" | "text";

export function VoiceRecorder() {
  const [mode, setMode] = useState<Mode>("voice");
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  const submitToApi = async (formData: FormData) => {
    setState("processing");
    try {
      const res = await fetch("/api/voice", { method: "POST", body: formData });
      const text = await res.text();
      if (!res.ok) {
        let msg = "Processing failed";
        try { msg = JSON.parse(text).error ?? msg; } catch {}
        throw new Error(msg);
      }
      const data = JSON.parse(text) as VoiceApiResponse;
      sessionStorage.setItem("voice_recipe", JSON.stringify(data));
      setState("done");
      router.push("/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setState("error");
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", new File([blob], "recording.webm", { type: "audio/webm" }));
        await submitToApi(formData);
      };

      recorder.start();
      setState("recording");
    } catch {
      setError("Could not access microphone. Please check permissions.");
      setState("error");
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const submitText = async () => {
    if (!textInput.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.append("text", textInput.trim());
    await submitToApi(formData);
  };

  const isProcessing = state === "processing";

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Voice to Recipe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Describe your recipe and let AI structure it for you.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-border p-1">
        <button
          onClick={() => { setMode("voice"); setError(null); setState("idle"); }}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "voice" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mic className="h-4 w-4" /> Record
        </button>
        <button
          onClick={() => { setMode("text"); setError(null); setState("idle"); }}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "text" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Type className="h-4 w-4" /> Type
        </button>
      </div>

      {mode === "voice" ? (
        <>
          <div className={cn(
            "relative flex h-32 w-32 items-center justify-center rounded-full transition-all",
            state === "recording" ? "bg-red-100 shadow-lg shadow-red-200" : "bg-muted"
          )}>
            {state === "recording" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-red-200 opacity-50" />
            )}
            {isProcessing ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : (
              <Mic className={cn("h-12 w-12", state === "recording" ? "text-red-500" : "text-muted-foreground")} />
            )}
          </div>

          {(state === "idle" || state === "error") && (
            <button onClick={startRecording} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-white hover:opacity-90">
              <Mic className="h-4 w-4" /> Start Recording
            </button>
          )}
          {state === "recording" && (
            <button onClick={stopRecording} className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 font-medium text-white hover:opacity-90">
              <Square className="h-4 w-4" /> Stop Recording
            </button>
          )}
          {isProcessing && <p className="text-sm text-muted-foreground">Transcribing and structuring your recipe…</p>}
        </>
      ) : (
        <div className="w-full max-w-lg space-y-3">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={8}
            placeholder={`Describe your recipe here. For example:\n\n"Spaghetti carbonara for 4 people. You'll need 400g spaghetti, 200g pancetta, 4 eggs, 100g parmesan, salt and black pepper. Boil the pasta in salted water for 10 minutes. Fry the pancetta until crispy. Mix eggs and parmesan. Combine everything off the heat and season well."`}
            disabled={isProcessing}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            onClick={submitText}
            disabled={isProcessing || !textInput.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Structuring recipe…</>
            ) : (
              "Structure with AI →"
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
