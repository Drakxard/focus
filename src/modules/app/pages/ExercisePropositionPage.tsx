import { FormEvent } from "react";
import { AppShell } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";
import { Attempt, ExercisePayload } from "../types";
import { parsePropositionPayload } from "../utils/payload";

interface ExercisePropositionPageProps {
  attempt: Attempt;
  exercise: ExercisePayload;
  onBack: () => void;
  onSubmit: (payload: { answer: string; proposition: string; index: number }) => void;
}

const MAX_CHARS = 10000;

interface StatementCardProps {
  exerciseId: string;
  statement: string;
  index: number;
  onSubmit: (answer: string) => void;
}

const StatementCard = ({ exerciseId, statement, index, onSubmit }: StatementCardProps) => {
  const draftId = `exercise-prop-${exerciseId}-${index}`;
  const { value, setValue, status, clear } = useAutosaveDraft(draftId, "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    clear();
    setValue("");
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Proposición {index + 1}</h3>
      <p>{statement}</p>
      <textarea
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next.length <= MAX_CHARS) setValue(next);
        }}
        className="text-input"
        rows={8}
      />
      <div className="footer-row">
        <StatusBadge status={status} />
        <button type="submit" disabled={!value.trim()}>
          Mandar
        </button>
      </div>
    </form>
  );
};

export const ExercisePropositionPage = ({ attempt, exercise, onBack, onSubmit }: ExercisePropositionPageProps) => {
  const statements = parsePropositionPayload(exercise.payload);

  return (
    <AppShell
      title="Ejercicios proposición"
      subtitle={`Intento ${attempt.latestVersion}`}
      left={
        <button type="button" onClick={onBack}>
          &lt;- Volver
        </button>
      }
    >
      <div className="grid">
        {statements.map((statement, index) => (
          <StatementCard
            key={`${exercise.exerciseId}-${index}`}
            exerciseId={exercise.exerciseId}
            statement={statement}
            index={index}
            onSubmit={(answer) => onSubmit({ answer, proposition: statement, index })}
          />
        ))}
      </div>
    </AppShell>
  );
};




