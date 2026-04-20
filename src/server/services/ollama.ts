import { readConfig } from "./config.js";
import type { OllamaModel } from "../../shared/types.js";

type OllamaTagsResponse = {
  models?: Array<{
    name: string;
    size?: number;
    modified_at?: string;
  }>;
};

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const config = await readConfig();
  const baseUrl = config.models?.providers?.ollama?.baseUrl ?? "http://127.0.0.1:11434";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);

  if (!response.ok) {
    throw new Error(`Ollama 返回 ${response.status}`);
  }

  const payload = (await response.json()) as OllamaTagsResponse;

  return (payload.models ?? []).map((model) => ({
    name: model.name,
    size: model.size,
    modifiedAt: model.modified_at
  }));
}

