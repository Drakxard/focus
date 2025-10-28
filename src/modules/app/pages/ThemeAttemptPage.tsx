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

const LatestFeedbackPanel = ({
  attempt,
  onOpenReview,
}: {
  attempt: Attempt | null;
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
}) => {
  if (!attempt) {
    return (
      <section className="card">
        <h3>Ultima critica</h3>
        <p className="muted" style={{ margin: 0 }}>
          Todavia no registraste ningun intento.
        </p>
      </section>
    );
  }

  const latestFeedback = attempt.feedbackHistory[0];

  if (!latestFeedback) {
    return (
      <section className="card">
        <h3>Ultima critica</h3>
        <p className="muted" style={{ margin: 0 }}>
          Todavia no hay critica asociada.
        </p>
      </section>
    );
  }

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <h3 style={{ marginBottom: "0.25rem" }}>Ultima critica</h3>
        <p className="muted" style={{ margin: 0 }}>
          Registrada el {formatDateTime(latestFeedback.createdAt)}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <strong>Resumen</strong>
          <p style={{ margin: "0.25rem 0 0" }}>{latestFeedback.summary}</p>
        </div>
        {latestFeedback.suggestion ? (
          <div>
            <strong>Sugerencia</strong>
            <p style={{ margin: "0.25rem 0 0" }}>{latestFeedback.suggestion}</p>
          </div>
        ) : null}
        {latestFeedback.errors.length ? (
          <div>
            <strong>Errores detectados</strong>
            <ol
              style={{
                margin: "0.5rem 0 0 1.25rem",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {latestFeedback.errors.map((error) => (
                <li key={error.id}>
                  <p style={{ margin: "0 0 0.25rem" }}>
                    <strong>Punto:</strong> {error.point}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Contraejemplo:</strong> {error.counterexample}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, latestFeedback.feedbackId)}>
        Abrir critica completa
      </button>
    </section>
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
  const [activePane, setActivePane] = useState(0);

  const latestAttempt = theme.attempts[0] ?? null;

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

  const panes = [
    {
      key: "attempt",
      title: "Describe tu comprension",
      description: "Cuenta con detalle lo que entiendes sobre el tema.",
      content: (
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
      ),
    },
    {
      key: "feedback",
      title: "Ultima critica",
      description: "Revisa la observacion mas reciente antes de iterar de nuevo.",
      content: <LatestFeedbackPanel attempt={latestAttempt} onOpenReview={onOpenReview} />,
    },
    {
      key: "history",
      title: "Historial de iteraciones",
      description: "Consulta tus envios previos y abre sus criticas.",
      content:
        theme.attempts.length > 0 ? (
          <AttemptHistory attempts={theme.attempts} onOpenReview={onOpenReview} />
        ) : (
          <section className="card">
            <h3>Historial de iteraciones</h3>
            <p className="muted" style={{ margin: 0 }}>
              Todavia no registraste intentos.
            </p>
          </section>
        ),
    },
  ] as const;

  const totalPanes = panes.length;
  const currentPane = panes[activePane];

  const goPrev = () => setActivePane((prev) => Math.max(0, prev - 1));
  const goNext = () => setActivePane((prev) => Math.min(totalPanes - 1, prev + 1));

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
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{currentPane.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              Vista {activePane + 1} de {totalPanes}. {currentPane.description}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="ghost" onClick={goPrev} disabled={activePane === 0}>
              {"<-"}
            </button>
            <button type="button" className="ghost" onClick={goNext} disabled={activePane === totalPanes - 1}>
              {"->"}
            </button>
          </div>
        </div>
        {currentPane.content}
      </div>
    </AppShell>
  );
};
