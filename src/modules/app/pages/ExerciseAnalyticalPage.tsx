import { FormEvent, useState } from "react";
import { AppShell } from "../components/Layout";
import { AutoTextarea } from "../components/AutoTextarea";
import { LatexRenderer } from "../components/LatexRenderer";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";
import { Attempt, ExercisePayload } from "../types";
import { parseAnalyticalPayload } from "../utils/payload";

interface ExerciseAnalyticalPageProps {
  attempt: Attempt;
  exercise: ExercisePayload;
  onBack: () => void;
  onSubmit: (answer: string) => void;
  onOpenSettings: () => void;
}

const MAX_CHARS = 10000;

export const ExerciseAnalyticalPage = ({ attempt, exercise, onBack, onSubmit, onOpenSettings }: ExerciseAnalyticalPageProps) => {
  const prompt = parseAnalyticalPayload(exercise.payload);
  const draftId = `exercise-${exercise.exerciseId}`;
  const { value, setValue, status, clear } = useAutosaveDraft(draftId, "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Escribe tu respuesta antes de enviar.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
    clear();
    setValue("");
  };

  return (
    <AppShell
      title="Ejercicio analítico"
      subtitle={`Intento ${attempt.latestVersion}`}
      left={
        <button type="button" onClick={onBack}>
          ← Volver
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
      <section className="card">
        <h3>Consigna</h3>
        <LatexRenderer content={prompt} />
        <pre className="code-block">{prompt}</pre>
      </section>
      <form className="card" onSubmit={handleSubmit}>
        <h3>Tu demostración</h3>
        <AutoTextarea
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (next.length <= MAX_CHARS) setValue(next);
          }}
          className="text-input large"
          rows={16}
        />
        <div className="muted">{value.length}/{MAX_CHARS} caracteres</div>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="actions">
          <button type="submit">Mandar</button>
        </div>
      </form>
    </AppShell>
  );
};









