import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { useAutosaveList } from "../hooks/useAutosaveList";

interface ThemesPageProps {
  draftId: string;
  initialThemes?: string[];
  onConfirm: (themes: string[]) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const ThemesPage = ({ draftId, initialThemes = [""], onConfirm, onBack, onOpenSettings }: ThemesPageProps) => {
  const [themes, setThemes] = useState(initialThemes.length ? initialThemes : [""]);
  const { status } = useAutosaveList(draftId, themes);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = themes.map((theme) => theme.trim()).filter(Boolean);
    if (!cleaned.length) {
      setError("Agrega al menos un tema.");
      return;
    }
    if (cleaned.length !== themes.length) {
      setError("Todos los temas deben tener título.");
      return;
    }
    setError(null);
    onConfirm(cleaned);
  };

  const canAddMore = useMemo(() => themes.length < 12, [themes.length]);

  return (
    <AppShell
      title="Ingresa Temas"
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
      <form className="card" onSubmit={handleSubmit}>
        <div className="themes-list">
          {themes.map((theme, index) => (
            <div className="theme-row" key={`theme-${index}`}>
              <label>
                Tema {index + 1}
                <input
                  value={theme}
                  maxLength={180}
                  placeholder="Título del tema"
                  onChange={(event) =>
                    setThemes((prev) => {
                      const next = [...prev];
                      next[index] = event.target.value;
                      return next;
                    })
                  }
                />
              </label>
              {themes.length > 1 ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    setThemes((prev) => prev.filter((_, position) => position !== index))
                  }
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {canAddMore ? (
          <button
            type="button"
            className="ghost"
            onClick={() => setThemes((prev) => [...prev, ""])}
          >
            + Agregar tema
          </button>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        <div className="actions">
          <button type="submit">Confirmar</button>
        </div>
      </form>
    </AppShell>
  );
};





