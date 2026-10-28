import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
  darkMode: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, darkMode }) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(code);
    window.setTimeout(() => {
      setCopiedSnippet((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  return (
    <div
      className={`text-sm sm:text-[15px] leading-relaxed space-y-3 break-words ${
        darkMode ? 'text-slate-100' : 'text-slate-800'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight mt-4 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight mt-4 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-base sm:text-lg font-bold tracking-tight mt-3 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-display text-sm sm:text-base font-semibold mt-2.5 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="leading-relaxed mb-2.5 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5 my-2.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 my-2.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className={`my-3 px-4 py-2.5 rounded-xl border text-sm italic ${
                darkMode
                  ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                  : 'bg-amber-50/70 border-amber-200/80 text-slate-700'
              }`}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs sm:text-sm tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead
              className={
                darkMode
                  ? 'bg-slate-900 text-slate-200 border-b border-slate-800'
                  : 'bg-amber-50/80 text-slate-900 border-b border-amber-200/70'
              }
            >
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td
              className={`px-3.5 py-2.5 border-t ${
                darkMode ? 'border-slate-800/80' : 'border-slate-200/70'
              }`}
            >
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const rawCode = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match || rawCode.includes('\n'));

            if (!isBlock) {
              return (
                <code
                  className={`font-mono text-[13px] px-1.5 py-0.5 rounded-md ${
                    darkMode
                      ? 'bg-slate-800 text-yellow-300'
                      : 'bg-amber-100/80 text-slate-900'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const langLabel = match?.[1] || 'code';
            const isCopied = copiedSnippet === rawCode;

            return (
              <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                  <span className="font-mono uppercase tracking-wider">{langLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(rawCode)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
                    aria-label="Copy code snippet"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto font-mono text-xs sm:text-[13px] leading-relaxed">
                  <code>{rawCode}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
