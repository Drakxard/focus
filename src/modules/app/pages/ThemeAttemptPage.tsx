import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../components/Layout";
import { LatexRenderer } from "../components/LatexRenderer";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";
import { Attempt, Theme, Topic } from "../types";

interface ThemeAttemptPageProps {
  topic: Topic;
  theme: Theme;
  onBack: () => void;
  onSubmit: (content: string) => void;
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
  onRefreshFeedback?: (attemptId: string) => void;
  onOpenSettings: () => void;
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
  onRefreshFeedback,
}: {
  attempt: Attempt | null;
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
  onRefreshFeedback?: (attemptId: string) => void;
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
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => onRefreshFeedback?.(attempt.attemptId)}>
          Actualizar critica
        </button>
        <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, latestFeedback.feedbackId)}>
          Ver critica completa
        </button>
      </div>
    </section>
  );
};

const AttemptHistory = ({
  attempts,
  onOpenReview,
  onSelectAttempt,
  onRefreshFeedback,
}: {
  attempts: Attempt[];
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
  onSelectAttempt?: (attemptId: string) => void;
  onRefreshFeedback?: (attemptId: string) => void;
}) => {
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
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => onSelectAttempt?.(attempt.attemptId)}>
                  Ver completo
                </button>
                {feedback ? (
                  <>
                    <button type="button" onClick={() => onRefreshFeedback?.(attempt.attemptId)}>
                      Actualizar critica
                    </button>
                    <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, feedback.feedbackId)}>
                      Abrir critica
                    </button>
                  </>
                ) : (
                  <span className="muted">Sin critica registrada</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const ThemeAttemptPage = ({
  topic,
  theme,
  onBack,
  onSubmit,
  onOpenReview,
  onRefreshFeedback,
  onOpenSettings,
}: ThemeAttemptPageProps) => {
  const draftId = `attempt-draft-${theme.themeId}`;
  const { value, setValue, status } = useAutosaveDraft(draftId, "");
  const latexDraftId = `attempt-latex-draft-${theme.themeId}`;
  const { value: latexContent, setValue: setLatexContent } = useAutosaveDraft(latexDraftId, "");
  const [isLatexEditing, setIsLatexEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePane, setActivePane] = useState(0);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const hasLatexContent = latexContent.trim().length > 0;

  const latestAttempt = theme.attempts[0] ?? null;
  const selectedAttempt = selectedAttemptId
    ? theme.attempts.find((attempt) => attempt.attemptId === selectedAttemptId) ?? null
    : null;

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

  useEffect(() => {
    if (selectedAttemptId && !selectedAttempt) {
      setSelectedAttemptId(null);
      setActivePane(2);
    }
  }, [selectedAttempt, selectedAttemptId]);

  const historyIndex = 2;
  const basePanes = [
    {
      key: "attempt",
      title: "Describe tu comprension",
      description: "Cuenta con detalle lo que entiendes sobre el tema.",
      content: (
        <form className="card" onSubmit={handleSubmit}>
          <section className="latex-editor">
            <div className="latex-editor__header">
              <h3 style={{ margin: 0 }}>Carga latex</h3>
              <button
                type="button"
                className="ghost"
                onClick={() => setIsLatexEditing((prev) => !prev)}
              >
                {isLatexEditing ? "Render" : "Edit"}
              </button>
            </div>
            {isLatexEditing ? (
              <>
                <label className="sr-only" htmlFor="attempt-latex">
                  Editor de expresiones LaTeX
                </label>
                <textarea
                  id="attempt-latex"
                  value={latexContent}
                  onChange={(event) => setLatexContent(event.target.value)}
                  placeholder="Escribe o pega aqui tu expresion en LaTeX..."
                  className="text-input code latex-editor__textarea"
                />
              </>
            ) : hasLatexContent ? (
              <div className="latex-editor__preview">
                <LatexRenderer content={latexContent} />
              </div>
            ) : (
              <div className="latex-editor__placeholder">Carga latex</div>
            )}
          </section>
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
      content: (
        <LatestFeedbackPanel
          attempt={latestAttempt}
          onOpenReview={onOpenReview}
          onRefreshFeedback={onRefreshFeedback}
        />
      ),
    },
    {
      key: "history",
      title: "Historial de iteraciones",
      description: "Consulta tus envios previos y abre sus criticas.",
      content:
        theme.attempts.length > 0 ? (
          <AttemptHistory
            attempts={theme.attempts}
            onOpenReview={onOpenReview}
            onSelectAttempt={(attemptId) => {
              setSelectedAttemptId(attemptId);
              setActivePane(basePanes.length);
            }}
            onSelectAttempt={(attemptId) => {
              setSelectedAttemptId(attemptId);
              setActivePane(basePanes.length);
            }}
            onRefreshFeedback={onRefreshFeedback}
          />
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

  const detailPane = selectedAttempt
    ? {
        key: `history-detail-${selectedAttempt.attemptId}`,
        title: `Iteracion #${selectedAttempt.latestVersion}`,
        description: "Revisa el envio completo y las criticas relacionadas.",
        content: (
          <section className="card">
            <div className="card__header" style={{ alignItems: "flex-start", gap: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>Detalle de iteracion #{selectedAttempt.latestVersion}</h3>
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  Creada el {formatDateTime(selectedAttempt.createdAt)} | Actualizada el{" "}
                  {formatDateTime(selectedAttempt.updatedAt)}
                </p>
              </div>
              <div className="page-toolbar">
                {onRefreshFeedback ? (
                  <button type="button" onClick={() => onRefreshFeedback(selectedAttempt.attemptId)}>
                    Actualizar critica
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSelectedAttemptId(null);
                    setActivePane(historyIndex);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="history-detail">
              <div className="history-detail__column">
                <h4>Versiones enviadas</h4>
                {selectedAttempt.versions.map((version) => (
                  <article key={version.version} className="history-detail__version">
                    <header>
                      <strong>Version {version.version}</strong>
                      <span className="muted">{formatDateTime(version.createdAt)}</span>
                    </header>
                    <div>{version.content ? <p style={{ whiteSpace: "pre-wrap" }}>{version.content}</p> : <p className="muted">Sin contenido.</p>}</div>
                  </article>
                ))}
              </div>
              <div className="history-detail__column">
                <h4>Criticas recibidas</h4>
                {selectedAttempt.feedbackHistory.length === 0 ? (
                  <p className="muted">Sin criticas asociadas.</p>
                ) : (
                  selectedAttempt.feedbackHistory.map((feedback) => (
                    <article key={feedback.feedbackId} className="history-detail__feedback">
                      <header>
                        <strong>{feedback.summary}</strong>
                        <span className="muted">{formatDateTime(feedback.createdAt)}</span>
                      </header>
                      {feedback.suggestion ? (
                        <p style={{ margin: "0.5rem 0" }}>
                          <strong>Sugerencia:</strong> {feedback.suggestion}
                        </p>
                      ) : null}
                      {feedback.errors.length ? (
                        <ul>
                          {feedback.errors.map((error) => (
                            <li key={error.id}>
                              <strong>{error.point}:</strong> {error.counterexample}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => onOpenReview?.(selectedAttempt.attemptId, feedback.feedbackId)}
                      >
                        Abrir critica
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        ),
      }
    : null;

  const panes = detailPane ? [...basePanes, detailPane] : basePanes;

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
      right={
        <div className="page-toolbar">
          <button type="button" className="ghost" onClick={onOpenSettings}>
            Ajustes
          </button>
          <StatusBadge status={status} />
        </div>
      }
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
