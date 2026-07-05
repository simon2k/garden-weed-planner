import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export const DEFAULT_MODEL = "openrouter/auto";

export interface OpenRouterModelOptions {
  apiKey?: string;
  modelName?: string;
  requireApiKey?: boolean;
}

export function getOpenRouterApiKey({ required = true }: { required?: boolean } = {}): string | undefined {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (required && !apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }
  return apiKey;
}

export function getOpenRouterModel({
  apiKey,
  modelName = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
  requireApiKey = false,
}: OpenRouterModelOptions = {}): LanguageModel {
  const resolvedApiKey = apiKey ?? getOpenRouterApiKey({ required: requireApiKey });
  const openrouter = createOpenRouter(resolvedApiKey ? { apiKey: resolvedApiKey } : {});

  return openrouter(modelName);
}
