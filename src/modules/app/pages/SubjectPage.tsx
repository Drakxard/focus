import { FormEvent, useState } from "react";
import { AppShell } from "../components/Layout";
import { AutoTextarea } from "../components/AutoTextarea";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";

interface SubjectPageProps {
  draftId: string;
  initialValue?: string;
  onConfirm: (subject: string) => void;
  onBack?: () => void;
  onOpenSettings: () => void;
}

export const SubjectPage = ({ draftId, initialValue = "", onConfirm, onBack, onOpenSettings }: SubjectPageProps) => {
  const { value, setValue, status } = useAutosaveDraft(draftId, initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("La asignatura no puede estar vacía.");
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <AppShell
      title="Ingresa Asignatura"
      left={
        onBack ? (
          <button type="button" onClick={onBack}>
            ← Volver
          </button>
        ) : null
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
      <form className="card" onSubmit={handleSubmit}>
        <AutoTextarea
          value={value}
          maxLength={300}
          placeholder="Nombre de la asignatura o curso..."
          onChange={(event) => setValue(event.target.value)}
          className="text-input"
        />
        {error ? <p className="error-text">{error}</p> : null}
        <div className="actions">
          <button type="submit">Confirmar</button>
        </div>
      </form>
    </AppShell>
  );
};





