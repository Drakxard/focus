import { FormEvent, useState } from "react";
import { AppShell } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";
import { Attempt, Theme, Topic } from "../types";

interface ThemeAttemptPageProps {
  topic: Topic;
  theme: Theme;
  onBack: () => void;
  onSubmit: (content: string) => void;
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
}

const MAX_CHARS = 10000;

const formatDateTime = (iso?: string) => {
  if (!iso) return "Fecha desconocida";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

const summarize = (text: string, limit = 220) => {
  if (!text.trim()) return "Sin contenido registrado.";
  if (text.length <= limit) return text;
  return text.slice(0, limit).trimEnd() + "...";
};

const LatestAttemptCard = ({ attempt, onOpenReview }: { attempt: Attempt; onOpenReview?: (attemptId: string, feedbackId: string) => void }) => {
  const latestVersion = attempt.versions[0];
  const latestFeedback = attempt.feedbackHistory[0];

  return (
    <aside
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "100%" }}
    >
      <div>
        <h3 style={{ marginBottom: "0.25rem" }}>Ultima explicacion</h3>
        <p className="muted" style={{ margin: 0 }}>
          Registrada el {formatDateTime(latestVersion?.createdAt ?? attempt.createdAt)}
        </p>
      </div>
      <div
        style={{
          whiteSpace: "pre-wrap",
          background: "rgba(255, 255, 255, 0.04)",
          borderRadius: "0.75rem",
          padding: "0.75rem",
          overflowY: "auto",
          maxHeight: "18rem",
        }}
      >
        {latestVersion?.content ?? "Sin contenido guardado todavia."}
      </div>
      {latestFeedback ? (
        <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, latestFeedback.feedbackId)}>
          Ver critica mas reciente
        </button>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Todavia no hay critica asociada.
        </p>
      )}
    </aside>
  );
};

const AttemptHistory = ({ attempts, onOpenReview }: { attempts: Attempt[]; onOpenReview?: (attemptId: string, feedbackId: string) => void }) => {
  return (
    <section className="card">
      <h3>Historial de iteraciones</h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {attempts.map((attempt) => {
          const version = attempt.versions[0];
          const feedback = attempt.feedbackHistory[0];
          return (
            <li
              key={attempt.attemptId}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "0.75rem",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong>Iteracion #{attempt.latestVersion}</strong>
                <span className="muted">{formatDateTime(version?.createdAt ?? attempt.updatedAt)}</span>
              </div>
              <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                {summarize(version?.content ?? "")}
              </div>
              {feedback ? (
                <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, feedback.feedbackId)}>
                  Abrir critica
                </button>
              ) : (
                <span className="muted">Sin critica registrada</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const ThemeAttemptPage = ({ topic, theme, onBack, onSubmit, onOpenReview }: ThemeAttemptPageProps) => {
  const draftId = `attempt-draft-${theme.themeId}`;
  const { value, setValue, status } = useAutosaveDraft(draftId, "");
  const [error, setError] = useState<string | null>(null);

  const latestAttempt = theme.attempts[0];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Describe tu comprension antes de confirmar.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  return (
    <AppShell
      title={theme.title}
      subtitle={`Asignatura: ${topic.subject}`}
      left={
        <button type="button" onClick={onBack}>
          &larr; Volver
        </button>
      }
      right={<StatusBadge status={status} />}
    >
      <div
        style={{
          display: latestAttempt ? "grid" : "block",
          gridTemplateColumns: latestAttempt ? "minmax(0, 2fr) minmax(0, 1fr)" : undefined,
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <form className="card" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="attempt-content">
            Describe tu comprension
          </label>
          <textarea
            id="attempt-content"
            value={value}
            maxLength={MAX_CHARS}
            placeholder="Describe los conocimientos que crees dominar sobre este tema..."
            onChange={(event) => {
              const next = event.target.value;
              if (next.length <= MAX_CHARS) {
                setValue(next);
              }
            }}
            className="text-input large"
          />
          <div className="muted">
            {value.length}/{MAX_CHARS} caracteres
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="actions">
            <button type="submit">Confirmar</button>
          </div>
        </form>
        {latestAttempt ? <LatestAttemptCard attempt={latestAttempt} onOpenReview={onOpenReview} /> : null}
      </div>
      {theme.attempts.length > 0 ? <AttemptHistory attempts={theme.attempts} onOpenReview={onOpenReview} /> : null}
    </AppShell>
  );
};
