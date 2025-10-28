import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "../components/Layout";
import { Attempt, AttemptFeedback } from "../types";
import { parseFeedbackJson } from "../services/validators";

interface FeedbackPageProps {
  attempt: Attempt;
  model: string;
  rawResponse: string;
  onConfirm: (feedback: AttemptFeedback, raw: string) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const FeedbackPage = ({
  attempt,
  model,
  rawResponse,
  onConfirm,
  onBack,
  onOpenSettings,
}: FeedbackPageProps) => {
  const [draft, setDraft] = useState(rawResponse.trim());

  const parseResult = useMemo(() => {
    const source = draft.trim() === rawResponse.trim() ? "model" : "manual";
    try {
      const feedback = parseFeedbackJson(draft, {
        model,
        expectedAttemptId: attempt.attemptId,
        source,
      });
      return { feedback, error: null };
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : String(validationError);
      return { feedback: null, error: message };
    }
  }, [attempt.attemptId, draft, model, rawResponse]);

  const errorMessage = parseResult.error;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!parseResult.feedback) {
      return;
    }
    onConfirm(parseResult.feedback, draft);
  };

  return (
    <AppShell
      title="Critica constructiva"
      subtitle={`Intento ${attempt.latestVersion}`}
      left={
        <button type="button" onClick={onBack}>
          &larr; Volver
        </button>
      }
      right={
        <div className="page-toolbar">
          <button type="button" className="ghost" onClick={onOpenSettings}>
            Ajustes
          </button>
        </div>
      }
    >
      <form className="feedback-layout" onSubmit={handleSubmit}>
        <section className="card">
          <h3>Respuesta en JSON</h3>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="text-input code"
            rows={18}
          />
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
          <div className="actions">
            <button type="submit" disabled={!parseResult.feedback}>
              Confirmar
            </button>
          </div>
        </section>
        <aside className="card summary">
          <h3>Resumen</h3>
          {parseResult.feedback ? (
            <div>
              <p>
                <strong>{parseResult.feedback.summary}</strong>
              </p>
              <p>{parseResult.feedback.suggestion}</p>
              <h4>Puntos con falla</h4>
              <ul>
                {parseResult.feedback.errors.map((item) => (
                  <li key={item.id}>
                    <strong>{item.point}:</strong> {item.counterexample}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted">Corrige el JSON para ver el resumen.</p>
          )}
        </aside>
      </form>
    </AppShell>
  );
};
