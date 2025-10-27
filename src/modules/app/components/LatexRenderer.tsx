import { ReactNode, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  content: string;
  inline?: boolean;
  className?: string;
  fallback?: ReactNode;
}

export const LatexRenderer = ({ content, inline = false, className, fallback }: LatexRendererProps) => {
  const rendered = useMemo(() => {
    try {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: !inline,
      });
    } catch (error) {
      console.warn("Latex render error", error);
      return null;
    }
  }, [content, inline]);

  if (!rendered) {
    return <>{fallback ?? content}</>;
  }

  const Element = inline ? "span" : "div";

  return <Element className={className} dangerouslySetInnerHTML={{ __html: rendered }} />;
};
