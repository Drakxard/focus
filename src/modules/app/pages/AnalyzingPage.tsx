import { useEffect, useState } from "react";
import { AppShell } from "../components/Layout";
import { PromptBundle } from "../types";

interface AnalyzingPageProps {
  context: PromptBundle;
  attemptKey: string;
  onFetch: () => Promise<void>;
  onManualCopy: (prompt: string) => void;
  onCancel: () => void;
  onRetry: () => void;
  retries: number;
  maxRetries: number;
  errorMessage?: string;
}

export const AnalyzingPage = ({
  context,
  attemptKey,
  onFetch,
  onManualCopy,
  onCancel,
  onRetry,
  retries,
  maxRetries,
  errorMessage,
}: AnalyzingPageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await onFetch();
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [attemptKey, onFetch]);

  const showRetry = Boolean(error) && retries < maxRetries;

  return (
    <AppShell
      title="Analizando puntos clave..."
      left={
        <button type="button" onClick={onCancel}>
          ← Cancelar
        </button>
      }
      right={
        <button type="button" onClick={() => onManualCopy(context.prompt)}>
          Copiar para hacerlo manual
        </button>
      }
    >
      <section className="card">
        <p>
          {isLoading
            ? "Consultando al modelo para obtener una crítica constructiva."
            : error
            ? "No fue posible completar el análisis."
            : "Resultados listos."}
        </p>
        {error ? <p className="error-text">{errorMessage ?? error}</p> : null}
        {showRetry ? (
          <button type="button" onClick={onRetry} disabled={isLoading}>
            Reintentar ({maxRetries - retries} restante)
          </button>
        ) : null}
        <div className="card spaced">
          <h3>Prompt enviado</h3>
          <pre className="code-block">{context.prompt}</pre>
        </div>
      </section>
    </AppShell>
  );
};







