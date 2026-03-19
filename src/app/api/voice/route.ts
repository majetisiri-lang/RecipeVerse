export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transcribeAudio } from "@/server/ai/whisper";
import { structureTranscript } from "@/server/ai/claude";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    // Support text fallback (bypasses Whisper)
    const textInput = formData.get("text");
    let transcript: string;

    if (textInput && typeof textInput === "string" && textInput.trim()) {
      transcript = textInput.trim();
    } else {
      const audio = formData.get("audio");
      if (!audio || !(audio instanceof File)) {
        return NextResponse.json({ error: "No audio or text provided" }, { status: 400 });
      }
      if (audio.size > MAX_SIZE) {
        return NextResponse.json({ error: "Audio file exceeds 25 MB limit" }, { status: 413 });
      }
      transcript = await transcribeAudio(audio);
    }

    const structured = await structureTranscript(transcript);

    return NextResponse.json({ transcript, structured });
  } catch (err) {
    console.error("[voice] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
