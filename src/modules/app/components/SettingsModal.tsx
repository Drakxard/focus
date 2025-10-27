import { FormEvent } from "react";
import { SettingsState } from "../types";
import "./settings.css";

interface SettingsModalProps {
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onApiKeyChange: (apiKey: string) => void;
  onFetchModels: () => void;
  onSelectModel: (modelId: string) => void;
}

export const SettingsModal = ({
  open,
  settings,
  onClose,
  onApiKeyChange,
  onFetchModels,
  onSelectModel,
}: SettingsModalProps) => {
  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onFetchModels();
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-panel">
        <header className="settings-panel__header">
          <h2>Ajustes de Groq</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Cerrar
          </button>
        </header>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            API Key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="gsk_..."
            />
          </label>
          <p className="muted">
            También puedes definir la variable <code>VITE_GROQ_API_KEY</code> en tu entorno para precargar este valor.
          </p>
          <div className="settings-actions">
            <button type="submit" disabled={!settings.apiKey || settings.status === "loading"}>
              {settings.status === "loading" ? "Cargando modelos..." : "Listar modelos"}
            </button>
            {settings.error ? <span className="error-text">{settings.error}</span> : null}
          </div>
        </form>
        <section className="settings-models">
          <h3>Modelos disponibles</h3>
          {settings.availableModels.length === 0 ? <p className="muted">Sin modelos cargados todavía.</p> : null}
          <ul>
            {settings.availableModels.map((model) => (
              <li key={model.id}>
                <label>
                  <input
                    type="radio"
                    name="groq-model"
                    value={model.id}
                    checked={settings.selectedModel === model.id}
                    onChange={() => onSelectModel(model.id)}
                  />
                  <span>
                    {model.id}
                    {model.description ? ` · ${model.description}` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
