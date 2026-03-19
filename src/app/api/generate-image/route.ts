export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, cuisine, description } = await req.json();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const prompt = [
      `A beautiful, appetizing food photography shot of ${title}`,
      cuisine ? `(${cuisine} cuisine)` : "",
      description ? `, ${description}` : "",
      ". Professional food photography, natural lighting, styled on a clean surface, high resolution.",
    ].filter(Boolean).join(" ");

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const url = response.data?.[0]?.url;
    if (!url) throw new Error("No image URL returned");

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[generate-image]", err);
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
