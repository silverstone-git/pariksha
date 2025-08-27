import React, { useRef, useEffect } from "react";
import "katex/dist/katex.min.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import renderMathInElement from "katex/dist/contrib/auto-render";

interface LatexProps {
  children: React.ReactNode;
}

export const Latex = ({ children }: LatexProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: "$", right: "$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }, [children]);

  return <div ref={ref}>{children}</div>;
};
