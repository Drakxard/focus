import { FormEvent } from "react";
import { DEFAULT_PROPOSITION_PROMPTS } from "../state/appStore";
import { PropositionPromptKind, SettingsState } from "../types";
import "./settings.css";

interface SettingsModalProps {
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onApiKeyChange: (apiKey: string) => void;
  onFetchModels: () => void;
  onSelectModel: (modelId: string) => void;
  onPromptChange: (kind: PropositionPromptKind, value: string) => void;
}

const PROMPT_FIELDS: Array<{ kind: PropositionPromptKind; label: string; help: string }> = [
  {
    kind: "initial",
    label: "Proposicion inicial (pre-envio)",
    help: "Se envia junto con la critica para obtener la proposicion base.",
  },
  {
    kind: "reciprocal",
    label: "Reciproco (q -> p)",
    help: "Usa {{condicion}} para insertar la proposicion inicial.",
  },
  {
    kind: "inverse",
    label: "Inverso (~p -> ~q)",
    help: "Usa {{condicion}} para insertar la proposicion inicial.",
  },
  {
    kind: "contraReciprocal",
    label: "Contra-reciproco (~q -> ~p)",
    help: "Usa {{condicion}} para insertar la proposicion inicial.",
  },
];

export const SettingsModal = ({
  open,
  settings,
  onClose,
  onApiKeyChange,
  onFetchModels,
  onSelectModel,
  onPromptChange,
}: SettingsModalProps) => {
  if (!open) return null;

  const prompts = settings.propositionPrompts ?? DEFAULT_PROPOSITION_PROMPTS;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onFetchModels();
  };

  const selectedModelDetails = settings.availableModels.find((model) => model.id === settings.selectedModel);

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
            Tambien puedes definir la variable <code>GROQ_API_KEY</code> en tu entorno para precargar este valor.
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
          {settings.availableModels.length === 0 ? (
            <p className="muted">Sin modelos cargados todavia.</p>
          ) : (
            <>
              <label className="settings-models__label">
                <span>Selecciona un modelo</span>
                <select value={settings.selectedModel} onChange={(event) => onSelectModel(event.target.value)}>
                  <option value="">-- Elige un modelo --</option>
                  {settings.availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </select>
              </label>
              {selectedModelDetails ? (
                <p className="muted">{selectedModelDetails.description ?? "Sin descripcion disponible."}</p>
              ) : null}
            </>
          )}
        </section>
        <section className="settings-prompts">
          <h3>Prompts para proposiciones</h3>
          <p className="muted">
            Usa <code>{"{{condicion}}"}</code> como marcador para insertar la critica o la proposicion base.
          </p>
          {PROMPT_FIELDS.map(({ kind, label, help }) => (
            <label key={kind} className="settings-prompts__field">
              <span>
                {label}
                <small className="muted">{help}</small>
              </span>
              <textarea
                value={prompts[kind]}
                onChange={(event) => onPromptChange(kind, event.target.value)}
                rows={4}
              />
            </label>
          ))}
        </section>
      </div>
    </div>
  );
};
