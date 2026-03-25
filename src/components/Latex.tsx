import React, { useRef, useEffect, useMemo } from "react";
import "katex/dist/katex.min.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import renderMathInElement from "katex/dist/contrib/auto-render";

interface LatexProps {
  children: React.ReactNode;
}

export const Latex = ({ children }: LatexProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Clean up double-escaped backslashes from LLM/JSON so KaTeX can read single backslash commands like \text
  const cleanLatex = useMemo(() => {
    if (typeof children !== "string") return children;
    return children.replace(/\\\\/g, '\\');
  }, [children]);

  useEffect(() => {
    if (ref.current) {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }, [cleanLatex]);

  return <div ref={ref}>{cleanLatex}</div>;
};
