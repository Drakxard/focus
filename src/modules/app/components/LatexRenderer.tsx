import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
  fallback?: ReactNode;
}

export const LatexRenderer = ({ content, inline = false, className, fallback }: LatexRendererProps) => {
  const blockRef = useRef<HTMLDivElement | null>(null);
  const inlineRef = useRef<HTMLSpanElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const defaultClass = inline ? "math-text-inline" : "math-text";

  useEffect(() => {
    const element = inline ? inlineRef.current : blockRef.current;
    if (!element) return;

    element.textContent = content;

    try {
      renderMathInElement(element, {
        delimiters: [
          { left: String.raw`\(`, right: String.raw`\)`, display: false },
          { left: String.raw`\[`, right: String.raw`\]`, display: true },
          { left: String.raw`$$`, right: String.raw`$$`, display: true },
          { left: String.raw`$`, right: String.raw`$`, display: false },
        ],
        throwOnError: false,
      });
      setHasError(false);
    } catch (error) {
      console.warn("Latex render error", error);
      setHasError(true);
    }
  }, [content, inline]);

  const FallbackElement = useMemo(() => (inline ? "span" : "div"), [inline]);

  if (hasError) {
    return (
      <FallbackElement className={className ?? defaultClass}>
        {fallback ?? <pre className="code-block">{content}</pre>}
      </FallbackElement>
    );
  }

  if (inline) {
    return <span ref={inlineRef} className={className ?? defaultClass} />;
  }
  return <div ref={blockRef} className={className ?? defaultClass} />;
};
