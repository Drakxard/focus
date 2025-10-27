import { AttemptFeedback, AttemptFeedbackError, ExercisePayload, ExerciseType } from "../types";

const isString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const normalizeType = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

export const parseFeedbackJson = (
  payload: string,
  meta: { model: string; expectedAttemptId: string; source?: "model" | "manual" }
): AttemptFeedback => {
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    throw new Error("El modelo no devolvió un JSON válido.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("La respuesta debe ser un objeto JSON.");
  }

  const map = data as Record<string, unknown>;
  const feedbackId = map.feedback_id;
  const attemptId = map.attempt_id;
  const summary = map.summary;
  const errors = map.errors;
  const suggestion = map.suggestion;

  if (!isString(feedbackId)) throw new Error("Falta 'feedback_id'.");
  if (!isString(attemptId)) throw new Error("Falta 'attempt_id'.");
  if (attemptId !== meta.expectedAttemptId)
    throw new Error("El 'attempt_id' no coincide con el intento actual.");
  if (!isString(summary)) throw new Error("Falta 'summary'.");
  if (!Array.isArray(errors) || !errors.length) throw new Error("'errors' debe ser una lista no vacía.");
  if (!isString(suggestion)) throw new Error("Falta 'suggestion'.");

  const errorItems: AttemptFeedbackError[] = errors.map((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`Error ${index + 1} no tiene estructura válida.`);
    }
    const bag = raw as Record<string, unknown>;
    const id = bag.id;
    const point = bag.point;
    const counterexample = bag.counterexample;
    if (!isString(id)) throw new Error("Cada error necesita 'id'.");
    if (!isString(point)) throw new Error("Cada error necesita 'point'.");
    if (!isString(counterexample)) throw new Error("Cada error necesita 'counterexample'.");
    return {
      id,
      point,
      counterexample,
    };
  });

  return {
    feedbackId,
    attemptId,
    summary,
    errors: errorItems,
    suggestion,
    model: meta.model,
    raw: payload,
    source: meta.source ?? "model",
    createdAt: new Date().toISOString(),
    version: 1,
  };
};

export const parseExerciseJson = (
  payload: string,
  meta: { model: string; attemptId: string }
): ExercisePayload => {
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    throw new Error("El ejercicio recibido no es JSON válido.");
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("El ejercicio debe ser un objeto JSON.");
  }

  const bag = data as Record<string, unknown>;
  const exerciseId = bag.exercise_id;
  const type = bag.type;
  const rawPayload = bag.payload;

  if (!isString(exerciseId)) throw new Error("Falta 'exercise_id'.");
  if (!isString(type)) throw new Error("Falta 'type'.");
  if (!isString(rawPayload)) throw new Error("Falta 'payload'.");

  const normalized = normalizeType(type);
  if (normalized !== "analitico" && normalized !== "proposicion") {
    throw new Error("El 'type' debe ser 'analítico' o 'proposición'.");
  }

  return {
    exerciseId,
    attemptId: meta.attemptId,
    type: normalized as ExerciseType,
    payload: rawPayload,
    createdAt: new Date().toISOString(),
    model: meta.model,
  };
};
