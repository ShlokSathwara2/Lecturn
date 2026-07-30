"use client"

import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

interface Props {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={className} style={{ lineHeight: 1.6, fontSize: 14 }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: "4px 0 8px 20px", paddingLeft: 8 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "4px 0 8px 20px", paddingLeft: 8 }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
          strong: ({ children }) => <strong style={{ color: "#e8e8e8" }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: "#a0a0a0" }}>{children}</em>,
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "8px 0", borderRadius: 8, border: "1px solid #2a2a2a" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: "rgba(59,130,246,0.1)" }}>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr style={{ borderBottom: "1px solid #2a2a2a" }}>{children}</tr>,
          th: ({ children }) => (
            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#e8e8e8", fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "nowrap" }}>{children}</th>
          ),
          td: ({ children }) => (
            <td style={{ padding: "8px 12px", color: "#b0b0b0", borderBottom: "1px solid rgba(42,42,42,0.5)" }}>{children}</td>
          ),
          code: ({ children, className: cls }) => {
            const isBlock = cls?.includes("language-")
            return isBlock ? (
              <code style={{ display: "block", padding: 12, borderRadius: 8, background: "rgba(26,26,26,0.8)", fontFamily: "var(--font-mono)", fontSize: 13, overflow: "auto", margin: "8px 0" }}>
                {children}
              </code>
            ) : (
              <code style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", fontFamily: "var(--font-mono)", fontSize: 13, color: "#3b82f6" }}>
                {children}
              </code>
            )
          },
          h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px", color: "#e8e8e8" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 600, margin: "14px 0 6px", color: "#e8e8e8" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, margin: "12px 0 4px", color: "#e8e8e8" }}>{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 12, margin: "8px 0", color: "#909090" }}>
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
