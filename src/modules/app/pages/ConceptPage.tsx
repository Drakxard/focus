import { AppShell } from "../components/Layout";
import { LatexRenderer } from "../components/LatexRenderer";
import { Attempt, AttemptFeedback } from "../types";

interface ConceptPageProps {
  attempt: Attempt;
  feedback: AttemptFeedback;
  conceptText: string;
  isConceptLoading: boolean;
  conceptError?: string;
  onReloadConcept: () => void;
  onReloadFeedback: () => void;
  onBack: () => void;
  onOpenAnalytical: () => void;
  onOpenProposition: () => void;
  limitReached: boolean;
  onOpenSettings: () => void;
}

export const ConceptPage = ({
  attempt,
  feedback,
  conceptText,
  isConceptLoading,
  conceptError,
  onReloadConcept,
  onReloadFeedback,
  onBack,
  onOpenAnalytical,
  onOpenProposition,
  limitReached,
  onOpenSettings,
}: ConceptPageProps) => {
  return (
    <AppShell
      title="Repaso de critica"
      subtitle={`Intento ${attempt.latestVersion} | Ciclos: ${attempt.cycles}/5`}
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
      <section className="card">
        <div className="card__header">
          <h2>Critica</h2>
          <button type="button" onClick={onReloadFeedback}>
            Actualizar critica
          </button>
        </div>
        <p>
          <strong>{feedback.summary}</strong>
        </p>
        <p>{feedback.suggestion}</p>
        <ul>
          {feedback.errors.map((error) => (
            <li key={error.id}>
              <strong>{error.point}:</strong> {error.counterexample}
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <div className="card__header">
          <h2>Teoria complementaria</h2>
          <button type="button" className="ghost" onClick={onReloadConcept} disabled={isConceptLoading}>
            Actualizar
          </button>
        </div>
        {isConceptLoading ? <p>Cargando explicacion...</p> : null}
        {conceptError ? <p className="error-text">{conceptError}</p> : null}
        {conceptText ? (
          <LatexRenderer content={conceptText} fallback={<p>{conceptText}</p>} />
        ) : null}
      </section>
      <section className="card horizontal">
        <div>
          <h3>Ejercicio analitico</h3>
          <p>Crea un ejercicio en LaTeX para profundizar en el concepto detectado.</p>
          <button type="button" onClick={onOpenAnalytical} disabled={limitReached}>
            Ejercicio analitico
          </button>
        </div>
        <div>
          <h3>Ejercicios proposicion</h3>
          <p>Reciproco, inverso y contrarreciproco sin identificar cual es cual.</p>
          <button type="button" onClick={onOpenProposition} disabled={limitReached}>
            Ejercicios proposicion
          </button>
        </div>
        {limitReached ? <p className="warning">Se alcanzo el limite de 5 ciclos para este intento.</p> : null}
      </section>
    </AppShell>
  );
};
