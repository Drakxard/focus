import { Attempt, AttemptFeedback, ExerciseType } from "../types";

interface FeedbackPromptInput {
  userContent: string;
  attemptId: string;
}

export const buildFeedbackPrompt = ({ userContent, attemptId }: FeedbackPromptInput) => `Esta es mi comprension sobre el tema. Indica fallas o vacios y responde solo con el JSON solicitado. Texto del estudiante entre comillas triples:
"""
${userContent}
"""

Tu respuesta debe ser un JSON valido, sin texto adicional, con la siguiente estructura exacta y en espanol:
{
  "feedback_id": "<identificador unico>",
  "attempt_id": "${attemptId}",
  "summary": "<resumen breve>",
  "errors": [
    {"id": "e1", "point": "<punto debil en frase corta>", "counterexample": "<contraejemplo concreto>"}
  ],
  "suggestion": "<plan de mejora conciso>"
}
No agregues comentarios ni explicaciones adicionales.
`;

interface ConceptPromptInput {
  feedback: AttemptFeedback;
  themeTitle: string;
}

export const buildConceptPrompt = ({ feedback, themeTitle }: ConceptPromptInput) => `A partir de la siguiente critica sobre el tema "${themeTitle}", redacta una explicacion clara y breve que ayude a reforzar la teoria necesaria. Texto de la critica:
"""
Resumen: ${feedback.summary}
Sugerencia: ${feedback.suggestion}
Errores:
${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point} -> ${error.counterexample}`)
  .join("\n")}
"""
Devuelve un parrafo en espanol que aclare los conceptos clave sin exceder 200 palabras.`;

interface ExercisePromptInput {
  feedback: AttemptFeedback;
  conceptText: string;
  attempt: Attempt;
}

export const buildAnalyticalExercisePrompt = ({ feedback, conceptText, attempt }: ExercisePromptInput) => `Genera un ejercicio analitico en notacion LaTeX que obligue al estudiante a aplicar la teoria detectada como debil en el intento ${attempt.latestVersion}. Critica:
Resumen: ${feedback.summary}
Errores: ${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point}`)
  .join("; ")}
Teoria de apoyo:
${conceptText}

Devuelve exclusivamente el JSON:
{
  "exercise_id": "<identificador unico>",
  "type": "analitico",
  "payload": "<enunciado en LaTeX escapado>"
}
`;

export const buildManualPrompt = (type: ExerciseType, basePrompt: string) => {
  if (type === "analitico") {
    return `${basePrompt}\n\nSigue el formato indicado y responde solo con JSON.`;
  }
  return `${basePrompt}\n\nRecuerda devolver unicamente el JSON solicitado.`;
};
