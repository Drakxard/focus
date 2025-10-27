import { FormEvent, useState } from "react";
import { AppShell } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";
import { Theme, Topic } from "../types";

interface ThemeAttemptPageProps {
  topic: Topic;
  theme: Theme;
  onBack: () => void;
  onSubmit: (content: string) => void;
}

const MAX_CHARS = 10000;

export const ThemeAttemptPage = ({ topic, theme, onBack, onSubmit }: ThemeAttemptPageProps) => {
  const draftId = `attempt-draft-${theme.themeId}`;
  const { value, setValue, status } = useAutosaveDraft(draftId, "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Describe tu comprensión antes de confirmar.");
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
          ? Volver
        </button>
      }
      right={<StatusBadge status={status} />}
    >
      <form className="card" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="attempt-content">
          Describe tu comprensión
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
        <div className="muted">{value.length}/{MAX_CHARS} caracteres</div>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="actions">
          <button type="submit">Confirmar</button>
        </div>
      </form>
    </AppShell>
  );
};


