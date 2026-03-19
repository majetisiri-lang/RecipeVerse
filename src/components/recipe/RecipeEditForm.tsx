"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecipeImagePicker } from "./RecipeImagePicker";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  servings: z.number().optional(),
  prepTimeMinutes: z.number().optional(),
  cookTimeMinutes: z.number().optional(),
  cuisine: z.string().optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    quantity: z.string().optional(),
    unit: z.string().optional(),
    notes: z.string().optional(),
  })),
  steps: z.array(z.object({
    stepNumber: z.number(),
    instruction: z.string().min(1),
  })),
});

type FormValues = z.infer<typeof formSchema>;

type RecipeData = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  cuisine: string | null;
  status: string;
  ingredients: { name: string; quantity: string | null; unit: string | null; notes: string | null; orderIndex: number }[];
  steps: { stepNumber: number; instruction: string }[];
};

const inputClass = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300";

export function RecipeEditForm({ recipe }: { recipe: RecipeData }) {
  const router = useRouter();
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    (recipe as RecipeData & { coverImageUrl?: string | null }).coverImageUrl ?? null
  );

  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const updateRecipe = trpc.recipes.update.useMutation({
    onSuccess: (updated) => router.push(`/recipe/${updated.id}`),
    onError: (err) => {
      setErrorBanner(err.message ?? "Something went wrong. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: recipe.title,
      description: recipe.description ?? "",
      servings: recipe.servings ?? undefined,
      prepTimeMinutes: recipe.prepTimeMinutes ?? undefined,
      cookTimeMinutes: recipe.cookTimeMinutes ?? undefined,
      cuisine: recipe.cuisine ?? "",
      ingredients: recipe.ingredients
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((i) => ({
          name: i.name,
          quantity: i.quantity ?? "",
          unit: i.unit ?? "",
          notes: i.notes ?? "",
        })),
      steps: recipe.steps
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map((s) => ({ stepNumber: s.stepNumber, instruction: s.instruction })),
    },
  });

  const { fields: ingFields, append: addIng, remove: removeIng } = useFieldArray({ control, name: "ingredients" });
  const { fields: stepFields, append: addStep, remove: removeStep } = useFieldArray({ control, name: "steps" });

  const onSubmit = (publish: boolean) =>
    handleSubmit((values) => {
      updateRecipe.mutate({
        id: recipe.id,
        title: values.title,
        description: values.description,
        servings: values.servings,
        prepTimeMinutes: values.prepTimeMinutes,
        cookTimeMinutes: values.cookTimeMinutes,
        cuisine: values.cuisine,
        coverImageUrl: coverImageUrl ?? undefined,
        publish,
        ingredients: values.ingredients.map((i, idx) => ({
          name: i.name,
          quantity: i.quantity || null,
          unit: i.unit || null,
          notes: i.notes || null,
          orderIndex: idx,
        })),
        steps: values.steps.map((s, idx) => ({
          stepNumber: idx + 1,
          instruction: s.instruction,
        })),
      });
    }, (validationErrors) => {
      const first = Object.values(validationErrors)[0];
      const msg = (first as { message?: string })?.message ?? "Please fix the errors below before submitting.";
      setErrorBanner(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    })();

  return (
    <form className="space-y-6 pb-10">
      {errorBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Couldn't save your recipe</p>
            <p className="mt-0.5">{errorBanner}</p>
          </div>
          <button type="button" onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input {...register("title")} className={inputClass} />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
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

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          ["servings", "Servings"],
          ["prepTimeMinutes", "Prep (min)"],
          ["cookTimeMinutes", "Cook (min)"],
          ["cuisine", "Cuisine"],
        ] as const).map(([name, label]) => (
          <div key={name}>
            <label className="block text-xs font-medium text-gray-500">{label}</label>
            <input
              {...register(name, name !== "cuisine" ? { valueAsNumber: true } : {})}
              type={name !== "cuisine" ? "number" : "text"}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        ))}
      </div>

      {/* Ingredients */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Ingredients</h2>
          <button type="button" onClick={() => addIng({ name: "", quantity: "", unit: "" })}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {ingFields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
              <input {...register(`ingredients.${i}.quantity`)} placeholder="Qty"
                className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900" />
              <input {...register(`ingredients.${i}.unit`)} placeholder="Unit"
                className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900" />
              <input {...register(`ingredients.${i}.name`)} placeholder="Ingredient"
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900" />
              <input {...register(`ingredients.${i}.notes`)} placeholder="Notes"
                className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900" />
              <button type="button" onClick={() => removeIng(i)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Steps</h2>
          <button type="button" onClick={() => addStep({ stepNumber: stepFields.length + 1, instruction: "" })}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-3">
          {stepFields.map((field, i) => (
            <div key={field.id} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <textarea {...register(`steps.${i}.instruction`)} rows={2}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none" />
              <button type="button" onClick={() => removeStep(i)} className="mt-1 text-gray-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={() => onSubmit(false)} disabled={updateRecipe.isPending}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
          Save Draft
        </button>
        <button type="button" onClick={() => onSubmit(true)} disabled={updateRecipe.isPending}
          className="flex-1 rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
          {updateRecipe.isPending ? "Saving…" : "Publish"}
        </button>
      </div>

    </form>
  );
}
