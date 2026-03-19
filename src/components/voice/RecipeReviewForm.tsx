"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceApiResponse } from "@/types/voice";
import { RecipeImagePicker } from "@/components/recipe/RecipeImagePicker";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  servings: z.number().nonnegative().optional().or(z.nan().transform(() => undefined)),
  prepTimeMinutes: z.number().nonnegative().optional().or(z.nan().transform(() => undefined)),
  cookTimeMinutes: z.number().nonnegative().optional().or(z.nan().transform(() => undefined)),
  cuisine: z.string().optional(),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.string().optional(),
      unit: z.string().optional(),
      notes: z.string().optional(),
      lowConfidence: z.boolean().optional(),
    })
  ),
  steps: z.array(
    z.object({
      stepNumber: z.number(),
      instruction: z.string().min(1),
      durationMinutes: z.number().nonnegative().optional().or(z.nan().transform(() => undefined)),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

export function RecipeReviewForm() {
  const router = useRouter();
  const [voiceData, setVoiceData] = useState<VoiceApiResponse | null>(null);
  const [titleAiGenerated, setTitleAiGenerated] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const createRecipe = trpc.recipes.create.useMutation({
    onSuccess: (recipe) => {
      router.push(`/recipe/${recipe.id}`);
    },
    onError: (err) => {
      setErrorBanner(err.message ?? "Something went wrong. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const { register, control, handleSubmit, reset, watch, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: { ingredients: [], steps: [] },
    });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } =
    useFieldArray({ control, name: "ingredients" });

  const { fields: stepFields, append: appendStep, remove: removeStep } =
    useFieldArray({ control, name: "steps" });

  useEffect(() => {
    const raw = sessionStorage.getItem("voice_recipe");
    if (!raw) return;
    const data = JSON.parse(raw) as VoiceApiResponse;
    setVoiceData(data);
    setTitleAiGenerated(data.structured.title_ai_generated);
    reset({
      title: data.structured.title ?? "",
      description: data.structured.description ?? "",
      servings: data.structured.servings ?? undefined,
      prepTimeMinutes: data.structured.prep_time_minutes ?? undefined,
      cookTimeMinutes: data.structured.cook_time_minutes ?? undefined,
      cuisine: data.structured.cuisine ?? "",
      ingredients: data.structured.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity ?? "",
        unit: i.unit ?? "",
        notes: i.notes ?? "",
        lowConfidence: i.low_confidence,
      })),
      steps: data.structured.steps.map((s) => ({
        stepNumber: s.step_number,
        instruction: s.instruction,
        durationMinutes: s.duration_minutes ?? undefined,
      })),
    });
  }, [reset]);

  const onSubmit = (publish: boolean) =>
    handleSubmit(
      (values: FormValues) => {
        createRecipe.mutate({
        title: values.title,
        description: values.description,
        servings: values.servings,
        prepTimeMinutes: values.prepTimeMinutes,
        cookTimeMinutes: values.cookTimeMinutes,
        cuisine: values.cuisine,
        coverImageUrl: coverImageUrl ?? undefined,
        aiGenerated: true,
        transcript: voiceData?.transcript,
        tags: voiceData?.structured.tags,
        publish,
        ingredients: values.ingredients.map((i, idx) => ({
          name: i.name,
          quantity: i.quantity || null,
          unit: i.unit || null,
          notes: i.notes || null,
          lowConfidence: i.lowConfidence,
          orderIndex: idx,
        })),
        steps: values.steps.map((s) => ({
          stepNumber: s.stepNumber,
          instruction: s.instruction,
          durationMinutes: s.durationMinutes || null,
        })),
        });
      },
      (validationErrors) => {
        const first = Object.values(validationErrors)[0];
        const msg =
          (first as { message?: string })?.message ??
          "Please fix the errors below before submitting.";
        setErrorBanner(msg);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    )();

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <div className="mx-auto max-w-2xl">
      {errorBanner && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Couldn't save your recipe</p>
            <p className="mt-0.5">{errorBanner}</p>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Your Recipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and edit the AI-extracted details before saving.
        </p>
      </div>

      {voiceData?.transcript && (
        <details className="mb-6 rounded-lg border border-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">View transcript</summary>
          <p className="mt-2 text-muted-foreground">{voiceData.transcript}</p>
        </details>
      )}

      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium">
            Title
            {titleAiGenerated && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                AI generated
              </span>
            )}
          </label>
          <input {...register("title")} className={inputClass} />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea {...register("description")} rows={3} className={inputClass} />
        </div>

        {/* Cover image */}
        <RecipeImagePicker
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          title={watch("title")}
          cuisine={watch("cuisine")}
          description={watch("description")}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["servings", "prepTimeMinutes", "cookTimeMinutes"] as const).map((name) => (
            <div key={name}>
              <label className="block text-xs font-medium text-muted-foreground capitalize">
                {name === "prepTimeMinutes" ? "Prep (min)" : name === "cookTimeMinutes" ? "Cook (min)" : "Servings"}
              </label>
              <input
                type="number"
                {...register(name, { valueAsNumber: true })}
                className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Cuisine</label>
            <input {...register("cuisine")} className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Ingredients</h2>
            <button
              type="button"
              onClick={() => appendIngredient({ name: "", quantity: "", unit: "" })}
              className="flex items-center gap-1 text-xs text-primary"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {ingredientFields.map((field, i) => (
              <div
                key={field.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2",
                  field.lowConfidence ? "border-amber-300 bg-amber-50" : "border-border"
                )}
              >
                {field.lowConfidence && <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                <input {...register(`ingredients.${i}.quantity`)} placeholder="Qty" className="w-14 rounded border border-border bg-white px-2 py-1 text-xs text-gray-900" />
                <input {...register(`ingredients.${i}.unit`)} placeholder="Unit" className="w-16 rounded border border-border bg-white px-2 py-1 text-xs text-gray-900" />
                <input {...register(`ingredients.${i}.name`)} placeholder="Ingredient" className="flex-1 rounded border border-border bg-white px-2 py-1 text-xs text-gray-900" />
                <input {...register(`ingredients.${i}.notes`)} placeholder="Notes" className="w-24 rounded border border-border bg-white px-2 py-1 text-xs text-gray-900" />
                <button type="button" onClick={() => removeIngredient(i)} className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Steps</h2>
            <button
              type="button"
              onClick={() => appendStep({ stepNumber: stepFields.length + 1, instruction: "" })}
              className="flex items-center gap-1 text-xs text-primary"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-3">
            {stepFields.map((field, i) => (
              <div key={field.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <textarea {...register(`steps.${i}.instruction`)} rows={2} className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none" />
                <button type="button" onClick={() => removeStep(i)} className="mt-1 text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => onSubmit(false)}
            disabled={createRecipe.isPending}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => onSubmit(true)}
            disabled={createRecipe.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {createRecipe.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>

      </form>
    </div>
  );
}
