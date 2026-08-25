"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders LLM markdown (headings, lists, tables, code, links) with the
 * product's typography. Used for assistant messages in Evidence Chat.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="chat-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-2 mt-3 text-[15px] font-bold tracking-tight first:mt-0" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-3 text-[14px] font-bold tracking-tight first:mt-0" {...p} />,
          h3: (p) => <h3 className="mb-1.5 mt-2.5 text-[13.5px] font-semibold first:mt-0" {...p} />,
          p: (p) => <p className="my-2 first:mt-0 last:mb-0" {...p} />,
          ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0" {...p} />,
          ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0" {...p} />,
          li: (p) => <li className="pl-0.5" {...p} />,
          a: (p) => (
            <a className="font-medium underline decoration-current underline-offset-2" target="_blank" rel="noreferrer" {...p} />
          ),
          strong: (p) => <strong className="font-semibold" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-2 border-l-[3px] border-current/30 pl-3 opacity-90 first:mt-0 last:mb-0" {...p} />
          ),
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className="tnum block overflow-x-auto rounded-lg bg-[#1a1d1f] p-3 text-left font-mono text-[11.5px] leading-relaxed text-[#f3f5fb]" {...rest}>
                  {String(children).replace(/\n$/, "")}
                </code>
              );
            }
            return (
              <code className="tnum rounded bg-[#1a1d1f]/8 px-1 py-0.5 font-mono text-[12px]" {...rest}>
                {children}
              </code>
            );
          },
          pre: (p) => <pre className="my-2 first:mt-0 last:mb-0" {...p} />,
          table: (p) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-current/15 first:mt-0 last:mb-0">
              <table className="w-full text-left text-[12.5px]" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-current/8" {...p} />,
          th: (p) => <th className="border-b border-current/15 px-2.5 py-1.5 font-semibold" {...p} />,
          td: (p) => <td className="border-b border-current/10 px-2.5 py-1.5 align-top last:border-0" {...p} />,
          hr: () => <hr className="my-3 border-current/15" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
