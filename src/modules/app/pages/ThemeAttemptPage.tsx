import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { AppShell } from "../components/Layout";
import { LatexMathfield } from "../components/LatexMathfield";
import { LatexRenderer } from "../components/LatexRenderer";
import katex from "katex";
import { StatusBadge } from "../components/StatusBadge";
import { AutoTextarea } from "../components/AutoTextarea";
import { useAutosaveDraft } from "../hooks/useAutosaveDraft";
import { Attempt, Theme, Topic } from "../types";
import { useAppStore } from "../state/appStore";

interface ThemeAttemptPageProps {
  topic: Topic;
  theme: Theme;
  onSubmit: (content: string) => void;
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
  onRefreshFeedback?: (attemptId: string) => void;
  onOpenSettings: () => void;
}

const MAX_CHARS = 10000;
const LATEX_PLACEHOLDER_REGEX = /\{\{latex\|([^|}]+)\|([^|}]+)(?:\|([^}]+))?\}\}/;
const createGlobalPlaceholderRegex = () => new RegExp(LATEX_PLACEHOLDER_REGEX.source, "g");

interface PlaceholderMatch {
  id: string;
  start: number;
  end: number;
  snippet: string;
  dataUrl?: string;
}

const createPlaceholderId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `latex-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveLatexPlaceholders = (input: string) =>
  input.replace(createGlobalPlaceholderRegex(), (_, __, encoded) => safeDecodeURIComponent(encoded));

let cachedKatexCss: string | null = null;
let katexCssPromise: Promise<string | null> | null = null;

const ensureKatexCss = async (): Promise<string | null> => {
  if (cachedKatexCss !== null) return cachedKatexCss;
  if (katexCssPromise) return katexCssPromise;
  katexCssPromise = (async () => {
    if (typeof document === "undefined") return null;
    for (const styleElement of Array.from(document.querySelectorAll("style"))) {
      const text = styleElement.textContent ?? "";
      if (text.includes(".katex")) {
        cachedKatexCss = text;
        return cachedKatexCss;
      }
    }
    for (const linkElement of Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[]) {
      if (!linkElement.href.toLowerCase().includes("katex")) continue;
      try {
        const response = await fetch(linkElement.href);
        if (response.ok) {
          const cssText = await response.text();
          cachedKatexCss = cssText;
          return cachedKatexCss;
        }
      } catch {
        // ignore fetch errors
      }
    }
    return null;
  })();
  const result = await katexCssPromise;
  katexCssPromise = null;
  return result;
};

const generateLatexImageData = async (
  snippet: string,
  options: { color: string; background: string; fontSizePx: number; fontFamily: string }
) => {
  if (typeof document === "undefined") return null;
  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.left = "-9999px";
  host.style.top = "-9999px";
  host.style.pointerEvents = "none";
  host.style.fontSize = `${options.fontSizePx}px`;
  host.style.color = options.color;
  host.style.background = "transparent";
  host.style.fontFamily = options.fontFamily;
  document.body.appendChild(host);

  try {
    katex.render(snippet || "", host, { throwOnError: false });
    const rect = host.getBoundingClientRect();
    const padding = 6;
    const width = Math.max(1, Math.ceil(rect.width) + padding * 2);
    const height = Math.max(1, Math.ceil(rect.height) + padding * 2);
    const cssText = await ensureKatexCss();
    const sanitizedCss = cssText ? cssText.replace(/]]>/g, "]]&gt;") : "";
    const styleBlock = sanitizedCss ? `<style type="text/css"><![CDATA[${sanitizedCss}]]></style>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${styleBlock}
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;padding:${padding}px;background:${options.background};color:${options.color};font-size:${options.fontSizePx}px;font-family:${options.fontFamily};">
      ${host.innerHTML}
    </div>
  </foreignObject>
</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  } catch (error) {
    console.warn("No se pudo generar imagen LaTeX.", error);
    return null;
  } finally {
    document.body.removeChild(host);
  }
};

const findPlaceholderIntersection = (source: string, start: number, end: number): PlaceholderMatch | null => {
  const regex = createGlobalPlaceholderRegex();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const [, id, encodedSnippet, encodedData] = match;
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    if (start < matchEnd && end > matchStart) {
      return {
        id,
        start: matchStart,
        end: matchEnd,
        snippet: safeDecodeURIComponent(encodedSnippet),
        dataUrl: encodedData ? safeDecodeURIComponent(encodedData) : undefined,
      };
    }
  }
  return null;
};

const formatDateTime = (iso?: string) => {
  if (!iso) return "Fecha desconocida";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

const summarize = (text: string, limit = 220) => {
  if (!text.trim()) return "Sin contenido registrado.";
  if (text.length <= limit) return text;
  return text.slice(0, limit).trimEnd() + "...";
};

const LatestFeedbackPanel = ({
  attempt,
  onOpenReview,
  onRefreshFeedback,
}: {
  attempt: Attempt | null;
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
  onRefreshFeedback?: (attemptId: string) => void;
}) => {
  if (!attempt) {
    return (
      <section className="card">
        <h3>Ultima critica</h3>
        <p className="muted" style={{ margin: 0 }}>
          Todavia no registraste ningun intento.
        </p>
      </section>
    );
  }

  const latestFeedback = attempt.feedbackHistory[0];

  if (!latestFeedback) {
    return (
      <section className="card">
        <h3>Ultima critica</h3>
        <p className="muted" style={{ margin: 0 }}>
          Todavia no hay critica asociada.
        </p>
      </section>
    );
  }

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <h3 style={{ marginBottom: "0.25rem" }}>Ultima critica</h3>
        <p className="muted" style={{ margin: 0 }}>
          Registrada el {formatDateTime(latestFeedback.createdAt)}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <strong>Resumen</strong>
          <p style={{ margin: "0.25rem 0 0" }}>{latestFeedback.summary}</p>
        </div>
        {latestFeedback.suggestion ? (
          <div>
            <strong>Sugerencia</strong>
            <p style={{ margin: "0.25rem 0 0" }}>{latestFeedback.suggestion}</p>
          </div>
        ) : null}
        {latestFeedback.errors.length ? (
          <div>
            <strong>Errores detectados</strong>
            <ol
              style={{
                margin: "0.5rem 0 0 1.25rem",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {latestFeedback.errors.map((error) => (
                <li key={error.id}>
                  <p style={{ margin: "0 0 0.25rem" }}>
                    <strong>Punto:</strong> {error.point}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Contraejemplo:</strong> {error.counterexample}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => onRefreshFeedback?.(attempt.attemptId)}>
          Actualizar critica
        </button>
        <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, latestFeedback.feedbackId)}>
          Ver critica completa
        </button>
      </div>
    </section>
  );
};

const AttemptHistory = ({
  attempts,
  onOpenReview,
  onSelectAttempt,
  onRefreshFeedback,
}: {
  attempts: Attempt[];
  onOpenReview?: (attemptId: string, feedbackId: string) => void;
  onSelectAttempt?: (attemptId: string) => void;
  onRefreshFeedback?: (attemptId: string) => void;
}) => {
  return (
    <section className="card">
      <h3>Historial de iteraciones</h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {attempts.map((attempt) => {
          const version = attempt.versions[0];
          const feedback = attempt.feedbackHistory[0];
          return (
            <li
              key={attempt.attemptId}
              style={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "0.75rem",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong>Iteracion #{attempt.latestVersion}</strong>
                <span className="muted">{formatDateTime(version?.createdAt ?? attempt.updatedAt)}</span>
              </div>
              <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                {summarize(version?.content ?? "")}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => onSelectAttempt?.(attempt.attemptId)}>
                  Ver completo
                </button>
                {feedback ? (
                  <>
                    <button type="button" onClick={() => onRefreshFeedback?.(attempt.attemptId)}>
                      Actualizar critica
                    </button>
                    <button type="button" className="ghost" onClick={() => onOpenReview?.(attempt.attemptId, feedback.feedbackId)}>
                      Abrir critica
                    </button>
                  </>
                ) : (
                  <span className="muted">Sin critica registrada</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const ThemeAttemptPage = ({
  topic,
  theme,
  onSubmit,
  onOpenReview,
  onRefreshFeedback,
  onOpenSettings,
}: ThemeAttemptPageProps) => {
  const draftId = `attempt-draft-${theme.themeId}`;
  const { value: latexContent, setValue: setLatexContent, status } = useAutosaveDraft(draftId, "");
  const latexFontScale = useAppStore((state) => state.settings.latexFontScale ?? 1);
  const updateLatexFontScale = useAppStore((state) => state.setLatexFontScale);
  const [error, setError] = useState<string | null>(null);
  const [latexModalOpen, setLatexModalOpen] = useState(false);
  const [latexSnippet, setLatexSnippet] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const latexFieldContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeLatexId, setActiveLatexId] = useState<string | null>(null);
  const [previewScrollTop, setPreviewScrollTop] = useState(0);
  const resolvedCharCount = useMemo(
    () => resolveLatexPlaceholders(latexContent).length,
    [latexContent]
  );

  const submitAttempt = useCallback(() => {
    const resolved = resolveLatexPlaceholders(latexContent).trim();
    if (!resolved) {
      setError("Expresa tu comprension antes de enviar.");
      return;
    }
    setError(null);
    onSubmit(resolved);
  }, [latexContent, onSubmit]);

  const handleContentChange = (next: string) => {
    if (resolveLatexPlaceholders(next).length <= MAX_CHARS) {
      setLatexContent(next);
      setError(null);
    }
  };

  const adjustLatexFont = (direction: "increase" | "decrease") => {
    const delta = direction === "increase" ? 0.1 : -0.1;
    const next = Math.round((latexFontScale + delta) * 100) / 100;
    updateLatexFontScale(next);
  };
  const [activePane, setActivePane] = useState(0);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const latestAttempt = theme.attempts[0] ?? null;
  const selectedAttempt = selectedAttemptId
    ? theme.attempts.find((attempt) => attempt.attemptId === selectedAttemptId) ?? null
    : null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitAttempt();
  };

  useEffect(() => {
    if (selectedAttemptId && !selectedAttempt) {
      setSelectedAttemptId(null);
      setActivePane(2);
    }
  }, [selectedAttempt, selectedAttemptId]);

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      submitAttempt();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      const node = textareaRef.current;
      if (!node) return;
      setSelectionRange({ start: node.selectionStart ?? node.value.length, end: node.selectionEnd ?? node.value.length });
      const selected = node.value.slice(node.selectionStart ?? 0, node.selectionEnd ?? 0);
      const placeholderMatch = selected.match(LATEX_PLACEHOLDER_REGEX);
      if (placeholderMatch) {
        const [, existingId, encoded] = placeholderMatch;
        setActiveLatexId(existingId);
        setLatexSnippet(safeDecodeURIComponent(encoded));
      } else {
        setActiveLatexId(null);
        setLatexSnippet(selected.trim());
      }
      setLatexModalOpen(true);
    }
  };

  const enforcePlaceholderBoundaries = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    const start = node.selectionStart ?? 0;
    const end = node.selectionEnd ?? start;
    const match = findPlaceholderIntersection(latexContent, start, end);
    if (match && start === end) {
      const boundary = start <= match.start ? match.start : match.end;
      node.setSelectionRange(boundary, boundary);
    }
  }, [latexContent]);

  const openLatexEditor = useCallback(
    (id: string, start: number, end: number, snippet: string) => {
      setSelectionRange({ start, end });
      setActiveLatexId(id);
      setLatexSnippet(snippet);
      setLatexModalOpen(true);
    },
    []
  );

  const handlePotentialPlaceholderEdit = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      const node = event.currentTarget;
      const start = node.selectionStart ?? 0;
      const end = node.selectionEnd ?? start;
      let match = findPlaceholderIntersection(latexContent, start, end);
      if (!match && start === end) {
        if (event.key === "Backspace") {
          match = findPlaceholderIntersection(latexContent, Math.max(0, start - 1), start);
        } else if (event.key === "Delete") {
          match = findPlaceholderIntersection(latexContent, start, Math.min(latexContent.length, end + 1));
        }
      }
      if (!match) {
        return false;
      }
      const isModifier = event.ctrlKey || event.metaKey || event.altKey;
      if (isModifier) {
        return false;
      }
      const editingKey =
        event.key.length === 1 ||
        event.key === "Enter" ||
        event.key === "Tab";
      if (editingKey) {
        event.preventDefault();
        openLatexEditor(match.id, match.start, match.end, match.snippet);
        return true;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        const before = latexContent.slice(0, match.start);
        const after = latexContent.slice(match.end);
        const cursor = event.key === "Backspace" ? match.start : before.length;
        const next = `${before}${after}`;
        setLatexContent(next);
        setTimeout(() => {
          const target = textareaRef.current;
          if (!target) return;
          target.setSelectionRange(cursor, cursor);
        }, 0);
        return true;
      }
      return false;
    },
    [latexContent, openLatexEditor, setLatexContent]
  );

  const handleTextareaKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (handlePotentialPlaceholderEdit(event)) {
      return;
    }
    handleEditorKeyDown(event);
  };

  const handleInsertLatex = useCallback(async () => {
    if (!selectionRange) {
      setLatexModalOpen(false);
      setActiveLatexId(null);
      setLatexSnippet("");
      return;
    }
    const trimmed = latexSnippet.trim();
    const before = latexContent.slice(0, selectionRange.start);
    const after = latexContent.slice(selectionRange.end);
    const placeholderId = activeLatexId ?? createPlaceholderId();
    const encodedSnippet = encodeURIComponent(trimmed);
    let dataUrl: string | null = null;
    if (trimmed) {
      const reference = textareaRef.current;
      const styles = reference ? window.getComputedStyle(reference) : window.getComputedStyle(document.body);
      const color = styles.color || "#000";
      const background = styles.backgroundColor || "transparent";
      const fontSizePx = parseFloat(styles.fontSize) || 16;
      const fontFamily = styles.fontFamily || "inherit";
      dataUrl = await generateLatexImageData(trimmed, { color, background, fontSizePx, fontFamily });
    }
    const dataSegment = dataUrl ? `|${encodeURIComponent(dataUrl)}` : "";
    const placeholder = trimmed ? `{{latex|${placeholderId}|${encodedSnippet}${dataSegment}}}` : "";
    const nextContent = `${before}${placeholder}${after}`;
    if (resolveLatexPlaceholders(nextContent).length > MAX_CHARS) {
      setError("No se pudo insertar el fragmento: superas el limite de 10000 caracteres.");
      return;
    }
    const cursor = before.length + placeholder.length;
    setLatexContent(nextContent);
    setSelectionRange(null);
    setActiveLatexId(null);
    setLatexSnippet("");
    setLatexModalOpen(false);
    setTimeout(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.selectionStart = cursor;
      node.selectionEnd = cursor;
    }, 0);
  }, [activeLatexId, latexContent, latexSnippet, selectionRange, setLatexContent]);

  useEffect(() => {
    if (!latexModalOpen) return;
    const timeout = window.setTimeout(() => {
      const container = latexFieldContainerRef.current;
      const mathField = container?.querySelector("math-field") as HTMLElement | null;
      mathField?.focus();
    }, 50);
    return () => window.clearTimeout(timeout);
  }, [latexModalOpen]);

  useEffect(() => {
    if (!latexModalOpen) return;
    const handleHotkeys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        void handleInsertLatex();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setLatexModalOpen(false);
        setActiveLatexId(null);
        setSelectionRange(null);
        setLatexSnippet("");
      }
    };
    window.addEventListener("keydown", handleHotkeys);
    return () => window.removeEventListener("keydown", handleHotkeys);
  }, [handleInsertLatex, latexModalOpen]);


  const previewNodes = useMemo(() => {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    const regex = createGlobalPlaceholderRegex();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(latexContent)) !== null) {
      const full = match[0];
      const id = match[1];
      const encodedSnippet = match[2];
      const encodedData = match[3];
      const start = match.index;
      const end = start + full.length;
      if (start > lastIndex) {
        const text = latexContent.slice(lastIndex, start\
      );
      nodes.push(
          <span key={`text-${lastIndex}`} className="attempt-editor__preview-text">
            {text}
          </span>
        );
      }
      const snippet = safeDecodeURIComponent(encodedSnippet);
      const dataUrl = encodedData ? safeDecodeURIComponent(encodedData) : undefined;
      const ghostElement = dataUrl ? (
        <img
          src={dataUrl}
          alt=""
          aria-hidden="true"
          className="attempt-editor__latex-img attempt-editor__latex-img--ghost"
          draggable={false}
        />
      ) : (
        <span aria-hidden="true" className="attempt-editor__latex-render attempt-editor__latex-render--ghost">
          <LatexRenderer
            inline
            className="attempt-editor__latex-render"
            content={`\\(${snippet}\\)`}
            fallback={snippet}
          />
        </span>
      );
      const visibleElement = dataUrl ? (
        <img
          src={dataUrl}
          alt={snippet || "Expresion LaTeX"}
          className="attempt-editor__latex-img"
          draggable={false}
        />
      ) : (
        <LatexRenderer
          inline
          className="attempt-editor__latex-render"
          content={`\\(${snippet}\\)`}
          fallback={snippet}
        />
      
      );
      nodes.push(
        <span
          key={`latex-${id}-${start}`}
          className="attempt-editor__latex-token"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            openLatexEditor(id, start, end, snippet);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openLatexEditor(id, start, end, snippet);
            }
          }}
          role="button"
          aria-label="Editar fragmento LaTeX"
          tabIndex={0}
          title="Editar LaTeX"
        >
          <span className="attempt-editor__placeholder-spacer">{ghostElement}</span>
          <span className="attempt-editor__latex-visual">{visibleElement}</span>
        </span>
      );
      lastIndex = end;
    }
    if (lastIndex < latexContent.length) {
      nodes.push(
        <span key={`text-tail`} className="attempt-editor__preview-text">
          {latexContent.slice(lastIndex)}
        </span>
      );
    }
    return nodes;
  }, [latexContent, openLatexEditor, setLatexContent]);

  const historyIndex = 2;
  const basePanes = [
    {
      key: "attempt",
      title: "Expresa tu comprension",
      description: "",
      content: (
        <form className="card attempt-editor" onSubmit={handleSubmit}>
          <section className="latex-editor">
            <div className="latex-editor__header">
              <div className="latex-editor__actions">
                <div className="font-scale-control" aria-label="Ajustar tamano de fuente">
                  <button
                    type="button"
                    className="ghost font-scale-control__button"
                    onClick={() => adjustLatexFont("decrease")}
                    title="Reducir tamano"
                  >
                    -
                  </button>
                  <span className="font-scale-control__value">{Math.round(latexFontScale * 100)}%</span>
                  <button
                    type="button"
                    className="ghost font-scale-control__button"
                    onClick={() => adjustLatexFont("increase")}
                    title="Aumentar tamano"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    const node = textareaRef.current;
                    if (node) {
                      setSelectionRange({
                        start: node.selectionStart ?? node.value.length,
                        end: node.selectionEnd ?? node.value.length,
                      });
                    }
                    setActiveLatexId(null);
                    setLatexSnippet("");
                    setLatexModalOpen(true);
                  }}
                >
                  Insertar LaTeX
                </button>
              </div>
            </div>
            <label className="sr-only" htmlFor="attempt-text">
              Texto del intento
            </label>
            <div className="attempt-editor__textarea-wrapper">
              <AutoTextarea
                id="attempt-text"
                ref={textareaRef}
                value={latexContent}
                onChange={(event) => handleContentChange(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onScroll={(event) => setPreviewScrollTop(event.currentTarget.scrollTop)}
                onSelect={enforcePlaceholderBoundaries}
                onClick={enforcePlaceholderBoundaries}
                onKeyUp={enforcePlaceholderBoundaries}
                className="text-input attempt-editor__textarea-input"
                style={{ fontSize: `${latexFontScale}rem`, lineHeight: 1.5 }}
                maxLength={MAX_CHARS}
              />
              <div
                className="attempt-editor__preview"
                style={{ transform: `translateY(-${previewScrollTop}px)`, fontSize: `${latexFontScale}rem`, lineHeight: 1.5 }}
                aria-hidden="true"
              >
                {previewNodes}
              </div>
            </div>
          </section>
          <div className="attempt-editor__footer">
            <span className="muted">
              {resolvedCharCount}/{MAX_CHARS} caracteres
            </span>
            <div className="attempt-editor__shortcuts">
              <span className="muted attempt-editor__shortcut">Ctrl + Enter envia</span>
              <span className="muted attempt-editor__shortcut">Ctrl + L inserta LaTeX</span>
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      ),
    },
    {
      key: "feedback",
      title: "Ultima critica",
      description: "Revisa la observacion mas reciente antes de iterar de nuevo.",
      content: (
        <LatestFeedbackPanel
          attempt={latestAttempt}
          onOpenReview={onOpenReview}
          onRefreshFeedback={onRefreshFeedback}
        />
      ),
    },
    {
      key: "history",
      title: "Historial de iteraciones",
      description: "Consulta tus envios previos y abre sus criticas.",
      content:
        theme.attempts.length > 0 ? (
          <AttemptHistory
            attempts={theme.attempts}
            onOpenReview={onOpenReview}
            onSelectAttempt={(attemptId) => {
              setSelectedAttemptId(attemptId);
              setActivePane(basePanes.length);
            }}
            onRefreshFeedback={onRefreshFeedback}
          />
        ) : (
          <section className="card">
            <h3>Historial de iteraciones</h3>
            <p className="muted" style={{ margin: 0 }}>
              Todavia no registraste intentos.
            </p>
          </section>
        ),
    },
  ] as const;

  const detailPane = selectedAttempt
    ? {
        key: `history-detail-${selectedAttempt.attemptId}`,
        title: `Iteracion #${selectedAttempt.latestVersion}`,
        description: "Revisa el envio completo y las criticas relacionadas.",
        content: (
          <section className="card">
            <div className="card__header" style={{ alignItems: "flex-start", gap: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>Detalle de iteracion #{selectedAttempt.latestVersion}</h3>
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  Creada el {formatDateTime(selectedAttempt.createdAt)} | Actualizada el{" "}
                  {formatDateTime(selectedAttempt.updatedAt)}
                </p>
              </div>
              <div className="page-toolbar">
                {onRefreshFeedback ? (
                  <button type="button" onClick={() => onRefreshFeedback(selectedAttempt.attemptId)}>
                    Actualizar critica
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSelectedAttemptId(null);
                    setActivePane(historyIndex);
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="history-detail">
              <div className="history-detail__column">
                <h4>Versiones enviadas</h4>
                {selectedAttempt.versions.map((version) => (
                  <article key={version.version} className="history-detail__version">
                    <header>
                      <strong>Version {version.version}</strong>
                      <span className="muted">{formatDateTime(version.createdAt)}</span>
                    </header>
                    <div>{version.content ? <p style={{ whiteSpace: "pre-wrap" }}>{version.content}</p> : <p className="muted">Sin contenido.</p>}</div>
                  </article>
                ))}
              </div>
              <div className="history-detail__column">
                <h4>Criticas recibidas</h4>
                {selectedAttempt.feedbackHistory.length === 0 ? (
                  <p className="muted">Sin criticas asociadas.</p>
                ) : (
                  selectedAttempt.feedbackHistory.map((feedback) => (
                    <article key={feedback.feedbackId} className="history-detail__feedback">
                      <header>
                        <strong>{feedback.summary}</strong>
                        <span className="muted">{formatDateTime(feedback.createdAt)}</span>
                      </header>
                      {feedback.suggestion ? (
                        <p style={{ margin: "0.5rem 0" }}>
                          <strong>Sugerencia:</strong> {feedback.suggestion}
                        </p>
                      ) : null}
                      {feedback.errors.length ? (
                        <ul>
                          {feedback.errors.map((error) => (
                            <li key={error.id}>
                              <strong>{error.point}:</strong> {error.counterexample}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => onOpenReview?.(selectedAttempt.attemptId, feedback.feedbackId)}
                      >
                        Abrir critica
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        ),
      }
    : null;

  const panes = detailPane ? [...basePanes, detailPane] : basePanes;

  const totalPanes = panes.length;
  const currentPane = panes[activePane];

  const goPrev = () => setActivePane((prev) => Math.max(0, prev - 1));
  const goNext = () => setActivePane((prev) => Math.min(totalPanes - 1, prev + 1));

  return (
    <AppShell
      title="Expresa tu comprension"
      right={
        <div className="page-toolbar">
          <button type="button" className="ghost" onClick={onOpenSettings}>
            Ajustes
          </button>
          <StatusBadge status={status} />
        </div>
      }
    >
      <div className="attempt-page">
        <div className="attempt-page__nav">
          <button
            type="button"
            className="ghost"
            onClick={goPrev}
            disabled={activePane === 0}
            aria-label="Panel anterior"
            title="Panel anterior"
          >
            {"<"}
          </button>
          <div className="attempt-page__dots" aria-hidden="true">
            {panes.map((pane, index) => (
              <span
                key={pane.key}
                className={`attempt-page__dot${index === activePane ? " is-active" : ""}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="ghost"
            onClick={goNext}
            disabled={activePane === totalPanes - 1}
            aria-label="Panel siguiente"
            title="Panel siguiente"
          >
            {">"}
          </button>
      </div>
        <div className="attempt-page__body">{currentPane.content}</div>
      </div>
      {latexModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" ref={latexFieldContainerRef}>
            <header className="modal__header">
              <h3 style={{ margin: 0 }}>Insertar fragmento LaTeX</h3>
              <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                Escribe el bloque en LaTeX. Usa Ctrl + Enter para insertar o Escape para cancelar.
              </p>
            </header>
            <LatexMathfield
              value={latexSnippet}
              onChange={setLatexSnippet}
              className="modal__mathfield"
              fontSizeRem={latexFontScale}
            />
            <div className="modal__actions">
              <button type="button" className="ghost" onClick={() => {
                setLatexModalOpen(false);
                setActiveLatexId(null);
                setSelectionRange(null);
                setLatexSnippet("");
              }}>
                Cancelar
              </button>
              <button type="button" onClick={handleInsertLatex} disabled={!latexSnippet.trim()}>
                Insertar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};


















