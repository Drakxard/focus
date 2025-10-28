import { useCallback, useEffect, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import "mathlive/static.css";

interface LatexMathfieldProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  alignment?: "left" | "center" | "right";
}

export const LatexMathfield = ({ value, onChange, className, placeholder, alignment = "center" }: LatexMathfieldProps) => {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const [isReady, setIsReady] = useState(false);

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

    element.smartMode = true;
    element.mathModeSpace = String.raw`\ `;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!element) return;
      if (event.defaultPrevented) return;
      const noModifiers = !event.altKey && !event.ctrlKey && !event.metaKey;

      if (event.key === " " && noModifiers) {
        event.preventDefault();
        element.insert(String.raw`\ `, {
          format: "latex",
          insertionMode: "replaceSelection",
          selectionMode: "after",
        });
        onChange(element.value);
        return;
      }

      if (event.key === "Enter" && noModifiers) {
        event.preventDefault();
        element.insert(String.raw`\\`, {
          format: "latex",
          insertionMode: "replaceSelection",
          selectionMode: "after",
        });
        element.insert("\n", {
          format: "plain-text",
          insertionMode: "insertAfter",
          selectionMode: "after",
        });
        onChange(element.value);
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReady, onChange]);

  return (
    <div className={["latex-mathfield", className].filter(Boolean).join(" ")} data-align={alignment}>
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
