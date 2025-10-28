import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { MathfieldElement } from "mathlive";
import "mathlive/static.css";

interface LatexMathfieldProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  fontSizeRem?: number;
}

export const LatexMathfield = ({ value, onChange, className, placeholder, fontSizeRem = 1 }: LatexMathfieldProps) => {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const containerStyle = useMemo<CSSProperties>(
    () => ({
      fontSize: `${fontSizeRem}rem`,
      "--latex-mathfield-scale": `${fontSizeRem}`,
    }),
    [fontSizeRem]
  );

  useEffect(() => {
    let mounted = true;
    import("mathlive")
      .then(({ MathfieldElement }) => {
        if (!customElements.get("math-field")) {
          customElements.define("math-field", MathfieldElement);
        }
        if (mounted) {
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error("No se pudo cargar el editor LaTeX interactivo.", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const element = fieldRef.current;
    if (!element) return;
    if (element.value !== value) {
      element.value = value;
    }
  }, [isReady, value]);

  const handleInput = useCallback(() => {
    const element = fieldRef.current;
    if (!element) return;
    onChange(element.value);
  }, [onChange]);

  const setRef = useCallback(
    (element: MathfieldElement | null) => {
      fieldRef.current = element;
      if (element && isReady) {
        element.value = value;
      }
    },
    [isReady, value]
  );

  useEffect(() => {
    if (!isReady) return;
    const element = fieldRef.current;
    if (!element) return;

    element.smartMode = false;
    element.defaultMode = "math";
    element.mathModeSpace = String.raw`\;`;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!element) return;
      if (event.defaultPrevented) return;
      const noModifiers = !event.altKey && !event.ctrlKey && !event.metaKey;

      if (event.key === "Enter" && noModifiers) {
        event.preventDefault();
        element.insert("\\\\", {
          format: "latex",
          insertionMode: "replaceSelection",
          selectionMode: "after",
        });
        onChange(element.value);
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    const handlePaste = (event: ClipboardEvent) => {
      if (!element) return;
      event.preventDefault();
      const text = event.clipboardData?.getData("text");
      if (!text) {
        return;
      }
      const normalized = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      const latex = normalized
        .split("\n")
        .map((line) => line.replace(/ /g, String.raw`\ `))
        .join(String.raw`\\` + "\n");

      element.insert(latex, {
        format: "latex",
        insertionMode: "replaceSelection",
        selectionMode: "after",
      });
      onChange(element.value);
    };

    element.addEventListener("paste", handlePaste);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("paste", handlePaste);
    };
  }, [isReady, onChange]);

  return (
    <div
      className={["latex-mathfield", className].filter(Boolean).join(" ")}
      style={containerStyle}
    >
      {isReady ? (
        <math-field
          ref={setRef}
          aria-label="Editor LaTeX interactivo"
          onInput={handleInput}
          value={value}
          placeholder={placeholder}
          virtual-keyboard-mode="manual"
        />
      ) : (
        <div className="latex-mathfield__loading">Cargando editor LaTeX...</div>
      )}
    </div>
  );
};
