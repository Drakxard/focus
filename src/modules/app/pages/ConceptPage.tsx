import { AppShell } from "../components/Layout";
import { Attempt, AttemptFeedback } from "../types";

interface ConceptPageProps {
  attempt: Attempt;
  feedback: AttemptFeedback;
  conceptText: string;
  isConceptLoading: boolean;
  conceptError?: string;
  onReloadConcept: () => void;
  onBack: () => void;
  onOpenAnalytical: () => void;
  onOpenProposition: () => void;
  limitReached: boolean;
}

export const ConceptPage = ({
  attempt,
  feedback,
  conceptText,
  isConceptLoading,
  conceptError,
  onReloadConcept,
  onBack,
  onOpenAnalytical,
  onOpenProposition,
  limitReached,
}: ConceptPageProps) => {
  return (
    <AppShell
      title="Repaso de cr�tica"
      subtitle={`Intento ${attempt.latestVersion} � Ciclos: ${attempt.cycles}/5`}
      left={
        <button type="button" onClick={onBack}>
          &lt;- Volver
        </button>
      }
    >
      <section className="card">
        <h2>Cr�tica</h2>
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
          <h2>Teor�a complementaria</h2>
          <button type="button" className="ghost" onClick={onReloadConcept} disabled={isConceptLoading}>
            Actualizar
          </button>
        </div>
        {isConceptLoading ? <p>Cargando explicaci�n�</p> : null}
        {conceptError ? <p className="error-text">{conceptError}</p> : null}
        {conceptText ? <p>{conceptText}</p> : null}
      </section>
      <section className="card horizontal">
        <div>
          <h3>Ejercicio anal�tico</h3>
          <p>Crea un ejercicio en LaTeX para profundizar en el concepto detectado.</p>
          <button type="button" onClick={onOpenAnalytical} disabled={limitReached}>
            Ejercicio anal�tico
          </button>
        </div>
        <div>
          <h3>Ejercicios proposici�n</h3>
          <p>Rec�proco, inverso y contrarrec�proco sin identificar cu�l es cu�l.</p>
          <button type="button" onClick={onOpenProposition} disabled={limitReached}>
            Ejercicios proposici�n
          </button>
        </div>
        {limitReached ? <p className="warning">Se alcanz� el l�mite de 5 ciclos para este intento.</p> : null}
      </section>
    </AppShell>
  );
};



