import { Attempt, AttemptFeedback, ExerciseType } from "../types";

interface FeedbackPromptInput {
  themeTitle: string;
  userContent: string;
  attemptId: string;
}

export const buildFeedbackPrompt = ({ themeTitle, userContent, attemptId }: FeedbackPromptInput) => `Analiza mi comprensión sobre "${themeTitle}" y devuelve exclusivamente el JSON pedido. Texto del estudiante entre comillas triples:
"""
${userContent}
"""

Tu respuesta debe ser un JSON válido, sin texto adicional, con la siguiente estructura exacta y en español:
{
  "feedback_id": "<identificador único>",
  "attempt_id": "${attemptId}",
  "summary": "<resumen breve>",
  "errors": [
    {"id": "e1", "point": "<punto débil en frase corta>", "counterexample": "<contraejemplo concreto>"}
  ],
  "suggestion": "<plan de mejora conciso>"
}
No generes Markdown ni comentarios.
`;

interface ConceptPromptInput {
  feedback: AttemptFeedback;
  themeTitle: string;
}

export const buildConceptPrompt = ({ feedback, themeTitle }: ConceptPromptInput) => `A partir de la siguiente crítica sobre el tema "${themeTitle}", redacta una explicación clara y breve que ayude a reforzar la teoría necesaria. Texto de la crítica:
"""
Resumen: ${feedback.summary}
Sugerencia: ${feedback.suggestion}
Errores:
${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point} -> ${error.counterexample}`)
  .join("\n")}
"""
Devuelve un párrafo en español que aclare los conceptos clave sin exceder 200 palabras.`;

interface ExercisePromptInput {
  feedback: AttemptFeedback;
  conceptText: string;
  attempt: Attempt;
}

export const buildAnalyticalExercisePrompt = ({ feedback, conceptText, attempt }: ExercisePromptInput) => `Genera un ejercicio analítico en notación LaTeX que obligue al estudiante a aplicar la teoría detectada como débil en el intento ${attempt.latestVersion}. Crítica:
Resumen: ${feedback.summary}
Errores: ${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point}`)
  .join("; ")}
Teoría de apoyo:
${conceptText}

Devuelve exclusivamente el JSON:
{
  "exercise_id": "<identificador único>",
  "type": "analítico",
  "payload": "<enunciado en LaTeX escapado>"
}
`;

export const buildPropositionExercisePrompt = ({
  feedback,
  conceptText,
  attempt,
}: ExercisePromptInput) => `Genera exactamente tres proposiciones distintas relacionadas con las debilidades detectadas en el intento ${attempt.latestVersion}. Una debe ser el recíproco, otra el inverso y otra el contrarrecíproco de una proposición base, pero no indiques cuál es cuál. Usa la crítica y la teoría de apoyo:
Resumen: ${feedback.summary}
Errores: ${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point}`)
  .join("; ")}
Teoría:
${conceptText}

Devuelve exclusivamente el JSON:
{
  "exercise_id": "<identificador único>",
  "type": "proposición",
  "payload": "<lista separada por saltos de línea o JSON con arreglo>"
}
`;

export const buildManualPrompt = (type: ExerciseType, basePrompt: string) => {
  if (type === "analitico") return `${basePrompt}\n\nSigue el formato indicado y responde solo con JSON.`;
  return `${basePrompt}\n\nRecuerda devolver únicamente el JSON solicitado.`;
};
