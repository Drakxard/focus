import { ApiModel, ExerciseType } from "../types";

const API_BASE = "https://api.groq.com/openai/v1";

const groqHeaders = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Configura la API key de Groq en Ajustes.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq API error (${response.status}): ${detail}`);
  }
  return response.json();
};

export const listGroqModels = async (apiKey: string): Promise<ApiModel[]> => {
  const response = await fetch(`${API_BASE}/models`, {
    method: "GET",
    headers: groqHeaders(apiKey),
  });
  const payload = (await handleResponse(response)) as { data?: unknown };
  if (!Array.isArray(payload.data)) {
    return [];
  }
  return payload.data
    .map((entry) => (typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : null))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && "id" in entry))
    .map((entry) => {
      const context = entry.context_length;
      return {
        id: String(entry.id),
        description: typeof entry.description === "string" ? entry.description : undefined,
        contextLength: typeof context === "number" ? context : undefined,
      };
    });
};

interface ChatCompletionParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | null;
}

const chatCompletion = async ({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.4,
  maxTokens = 1024,
  responseFormat = "json_object",
}: ChatCompletionParams): Promise<string> => {
  const headers = groqHeaders(apiKey);
  const body: Record<string, unknown> = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (responseFormat) {
    body.response_format = { type: responseFormat };
  }

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await handleResponse(response);
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("La respuesta del modelo está vacía.");
  }
  return content.trim();
};

export const requestFeedback = async (params: {
  apiKey: string;
  model: string;
  prompt: string;
}) => {
  return chatCompletion({
    apiKey: params.apiKey,
    model: params.model,
    systemPrompt:
      "Eres un tutor experto que debe devolver exclusivamente JSON válido siguiendo las instrucciones del usuario.",
    userPrompt: params.prompt,
    temperature: 0.2,
    maxTokens: 1200,
    responseFormat: "json_object",
  });
};

export const requestConcept = async (params: {
  apiKey: string;
  model: string;
  prompt: string;
}) => {
  return chatCompletion({
    apiKey: params.apiKey,
    model: params.model,
    systemPrompt: "Eres un docente que explica conceptos con precisión y concisión.",
    userPrompt: params.prompt,
    temperature: 0.4,
    maxTokens: 900,
    responseFormat: null,
  });
};

export const requestExercise = async (params: {
  apiKey: string;
  model: string;
  prompt: string;
  type: ExerciseType;
}) => {
  return chatCompletion({
    apiKey: params.apiKey,
    model: params.model,
    systemPrompt:
      "Genera ejercicios desafiantes y devuelve exclusivamente el JSON solicitado. No agregues comentarios adicionales.",
    userPrompt: params.prompt,
    temperature: 0.35,
    maxTokens: params.type === "proposicion" ? 1200 : 800,
    responseFormat: "json_object",
  });
};


