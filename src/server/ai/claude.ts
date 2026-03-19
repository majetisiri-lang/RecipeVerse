import Anthropic from "@anthropic-ai/sdk";
import type { StructuredRecipe } from "@/types/voice";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Given a voice transcript of someone describing a recipe, extract the recipe details into a structured JSON format.

Rules:
- Only extract what was explicitly said — do not invent details
- Use null for any fields not mentioned
- Separate quantity and unit (e.g. "2" and "cups", not "2 cups")
- Set title_ai_generated to true if you had to infer the title
- Set low_confidence to true on ingredients where quantity/unit was unclear
- For "cuisine": always infer this from the dish name, ingredients, and cooking style even if not explicitly stated. Use common cuisine categories like Italian, Mexican, Indian, Chinese, Japanese, Korean, Thai, French, American, Mediterranean, Middle Eastern, Greek, Spanish, Dessert, etc. Only use null if truly impossible to determine.
- Return ONLY valid JSON matching the schema below, no markdown or explanation

Schema:
{
  "title": string | null,
  "title_ai_generated": boolean,
  "description": string | null,
  "servings": number | null,
  "prep_time_minutes": number | null,
  "cook_time_minutes": number | null,
  "cuisine": string | null,
  "ingredients": [
    {
      "name": string,
      "quantity": string | null,
      "unit": string | null,
      "notes": string | null,
      "low_confidence": boolean
    }
  ],
  "steps": [
    {
      "step_number": number,
      "instruction": string,
      "duration_minutes": number | null,
      "timer_required": boolean
    }
  ],
  "tags": string[]
}`;

export async function structureTranscript(
  transcript: string
): Promise<StructuredRecipe> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Please extract the recipe from this transcript:\n\n${transcript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    // Strip markdown code fences if present
    const raw = content.text.trim();
    const json = raw.startsWith("```")
      ? raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
      : raw;
    return JSON.parse(json) as StructuredRecipe;
  } catch {
    console.error("[claude] Raw response:", content.text);
    throw new Error("Failed to parse structured recipe from Claude response");
  }
}
