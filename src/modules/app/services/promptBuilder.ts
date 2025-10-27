import { Attempt, AttemptFeedback, ExerciseType } from "../types";

interface FeedbackPromptInput {
  themeTitle: string;
  userContent: string;
  attemptId: string;
}

export const buildFeedbackPrompt = ({ themeTitle, userContent, attemptId }: FeedbackPromptInput) => `Analiza mi comprensi�n sobre "${themeTitle}" y devuelve exclusivamente el JSON pedido. Texto del estudiante entre comillas triples:
"""
${userContent}
"""

Tu respuesta debe ser un JSON v�lido, sin texto adicional, con la siguiente estructura exacta y en espa�ol:
{
  "feedback_id": "<identificador �nico>",
  "attempt_id": "${attemptId}",
  "summary": "<resumen breve>",
  "errors": [
    {"id": "e1", "point": "<punto d�bil en frase corta>", "counterexample": "<contraejemplo concreto>"}
  ],
  "suggestion": "<plan de mejora conciso>"
}
No generes Markdown ni comentarios.
`;

interface ConceptPromptInput {
  feedback: AttemptFeedback;
  themeTitle: string;
}

export const buildConceptPrompt = ({ feedback, themeTitle }: ConceptPromptInput) => `A partir de la siguiente cr�tica sobre el tema "${themeTitle}", redacta una explicaci�n clara y breve que ayude a reforzar la teor�a necesaria. Texto de la cr�tica:
"""
Resumen: ${feedback.summary}
Sugerencia: ${feedback.suggestion}
Errores:
${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point} -> ${error.counterexample}`)
  .join("\n")}
"""
Devuelve un p�rrafo en espa�ol que aclare los conceptos clave sin exceder 200 palabras.`;

interface ExercisePromptInput {
  feedback: AttemptFeedback;
  conceptText: string;
  attempt: Attempt;
}

export const buildAnalyticalExercisePrompt = ({ feedback, conceptText, attempt }: ExercisePromptInput) => `Genera un ejercicio anal�tico en notaci�n LaTeX que obligue al estudiante a aplicar la teor�a detectada como d�bil en el intento ${attempt.latestVersion}. Cr�tica:
Resumen: ${feedback.summary}
Errores: ${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point}`)
  .join("; ")}
Teor�a de apoyo:
${conceptText}

Devuelve exclusivamente el JSON:
{
  "exercise_id": "<identificador �nico>",
  "type": "anal�tico",
  "payload": "<enunciado en LaTeX escapado>"
}
`;

export const buildPropositionExercisePrompt = ({
  feedback,
  conceptText,
  attempt,
}: ExercisePromptInput) => `Genera exactamente tres proposiciones distintas relacionadas con las debilidades detectadas en el intento ${attempt.latestVersion}. Una debe ser el rec�proco, otra el inverso y otra el contrarrec�proco de una proposici�n base, pero no indiques cu�l es cu�l. Usa la cr�tica y la teor�a de apoyo:
Resumen: ${feedback.summary}
Errores: ${feedback.errors
  .map((error, index) => `${index + 1}. ${error.point}`)
  .join("; ")}
Teor�a:
${conceptText}

Devuelve exclusivamente el JSON:
{
  "exercise_id": "<identificador �nico>",
  "type": "proposici�n",
  "payload": "<lista separada por saltos de l�nea o JSON con arreglo>"
}
`;

export const buildManualPrompt = (type: ExerciseType, basePrompt: string) => {
  if (type === "analitico") return `${basePrompt}\n\nSigue el formato indicado y responde solo con JSON.`;
  return `${basePrompt}\n\nRecuerda devolver �nicamente el JSON solicitado.`;
};
