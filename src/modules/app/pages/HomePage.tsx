import { AppShell } from "../components/Layout";
import { Topic, Theme } from "../types";

interface HomePageProps {
  topics: Topic[];
  onCreateTopic: () => void;
  onOpenTheme: (topicId: string, themeId: string) => void;
  onAddTheme: (topicId: string) => void;
  onDeleteTheme: (topicId: string, themeId: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onExportTopic: (topicId: string) => void;
  onOpenSettings: () => void;
}

const ThemeSummary = ({
  theme,
  onOpen,
  onDelete,
}: {
  theme: Theme;
  onOpen: () => void;
  onDelete: () => void;
}) => {
  const latestAttempt = theme.attempts[0];
  const latestFeedback = latestAttempt?.feedbackHistory[0];

  return (
    <div className="theme-card">
      <div className="theme-card__header">
        <h3>{theme.title}</h3>
        <div className="theme-card__actions">
          <button type="button" onClick={onOpen}>
            Abrir →
          </button>
          <button type="button" className="ghost danger" onClick={onDelete}>
            Eliminar
          </button>
        </div>
      </div>
      {latestAttempt ? (
        <>
          <p className="muted">Último estado: {latestAttempt.status}</p>
          {latestFeedback ? (
            <div className="feedback-snippet">
              <strong>{latestFeedback.summary}</strong>
              <ul>
                {latestFeedback.errors.slice(0, 2).map((error) => (
                  <li key={error.id}>{error.point}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted">Sin feedback aún.</p>
          )}
        </>
      ) : (
        <p className="muted">Aún no hay intentos.</p>
      )}
    </div>
  );
};

export const HomePage = ({
  topics,
  onCreateTopic,
  onOpenTheme,
  onAddTheme,
  onDeleteTheme,
  onDeleteTopic,
  onExportTopic,
  onOpenSettings,
}: HomePageProps) => {
  return (
    <AppShell
      title="Página Inicial"
      subtitle="Repasa asignaturas y temas"
      right={
        <div className="home-toolbar">
          <button type="button" className="ghost" onClick={onOpenSettings}>
            Ajustes
          </button>
          <button type="button" onClick={onCreateTopic}>
            + Nueva asignatura
          </button>
        </div>
      }
    >
      <div className="topics-grid">
        {topics.length === 0 ? <p className="muted">Crea tu primera asignatura.</p> : null}
        {topics.map((topic) => (
          <section className="topic-card" key={topic.topicId}>
            <header>
              <h2>{topic.subject}</h2>
              <div className="topic-card__actions">
                <button type="button" onClick={() => onAddTheme(topic.topicId)}>
                  + Agregar tema
                </button>
                <button type="button" className="ghost" onClick={() => onExportTopic(topic.topicId)}>
                  Exportar JSON
                </button>
                <button type="button" className="ghost danger" onClick={() => onDeleteTopic(topic.topicId)}>
                  Eliminar asignatura
                </button>
              </div>
            </header>
            <div className="topic-card__themes">
              {topic.themes.map((theme) => (
                <ThemeSummary
                  key={theme.themeId}
                  theme={theme}
                  onOpen={() => onOpenTheme(topic.topicId, theme.themeId)}
                  onDelete={() => onDeleteTheme(topic.topicId, theme.themeId)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
};



