export interface StructuredIngredient {
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  low_confidence: boolean;
}

export interface StructuredStep {
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  timer_required: boolean;
}

export interface StructuredRecipe {
  title: string | null;
  title_ai_generated: boolean;
  description: string | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  cuisine: string | null;
  ingredients: StructuredIngredient[];
  steps: StructuredStep[];
  tags: string[];
}

export interface VoiceApiResponse {
  transcript: string;
  structured: StructuredRecipe;
}
