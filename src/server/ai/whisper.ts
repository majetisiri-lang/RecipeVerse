import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(file: File): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
  });
  return transcription as unknown as string;
}
