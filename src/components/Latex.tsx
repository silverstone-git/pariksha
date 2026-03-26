import React, { useRef, useEffect, useMemo } from "react";
import "katex/dist/katex.min.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import renderMathInElement from "katex/dist/contrib/auto-render";

interface LatexProps {
  children: React.ReactNode;
}

/**
 * LaTeX component that renders math using KaTeX.
 * Specifically handles double-escaping and missing delimiters from LLM output.
 */
export const Latex = ({ children }: LatexProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const cleanLatex = useMemo(() => {
    if (typeof children !== "string") return children;
    
    let text = children;

    // 1. Repair Double Escaping for Commands
    // Collapse \\command to \command (but keep standalone \\ for row breaks)
    // Regex: look for two backslashes followed by a letter.
    text = text.replace(/\\\\([a-zA-Z])/g, '\\$1');

    // 2. Repair Row Breaks
    // If the LLM outputted quadruple backslashes for row breaks \\\\ (which become \\ in JS),
    // and we already did a generic replace earlier, we might have broken it.
    // In many scientific banks, a row break is actually just \\ in the parsed string.
    // If it's missing, we don't have much to go on, but usually it's there.

    // 3. Wrap naked environments
    const needsWrapping = (text.includes('\\begin{') || text.includes('\\pmatrix') || text.includes('\\bmatrix')) && !text.includes('$');
    if (needsWrapping) {
        // If it's a matrix, it MUST be in display mode or delimited to render row breaks properly
        text = `$$ ${text} $$`;
    }

    // 4. Individual Symbol Repair (if not inside $)
    if (!text.includes('$') && !text.includes('\\(')) {
        const mathSymbols = [
            'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'phi', 'chi', 'psi', 'omega',
            'neq', 'pm', 'times', 'div', 'sqrt', 'frac', 'int', 'sum', 'prod', 'mathbf', 'mathcal', 'mathbb', 'text', 'partial', 'nabla', 'infty', 'hbar'
        ];
        mathSymbols.forEach(sym => {
            const regex = new RegExp(`\\\\${sym}`, 'g');
            if (text.includes(`\\${sym}`)) {
                text = text.replace(regex, `$ \\\\${sym} $`);
            }
        });
    }

    return text;
  }, [children]);

  useEffect(() => {
    if (ref.current) {
      try {
        renderMathInElement(ref.current, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ],
          throwOnError: false,
          errorColor: "#f87171",
          ignoredTags: ["script", "style", "head", "pre", "code"]
        });
      } catch (e) {
        console.error("KaTeX rendering error:", e);
      }
    }
  }, [cleanLatex]);

  return <div ref={ref} className="latex-container block w-full">{cleanLatex}</div>;
};
