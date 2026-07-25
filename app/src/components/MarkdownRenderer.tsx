"use client"

import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
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
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: "4px 0 8px 20px", paddingLeft: 8 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "4px 0 8px 20px", paddingLeft: 8 }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
          strong: ({ children }) => <strong style={{ color: "#e8e8e8" }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: "#a0a0a0" }}>{children}</em>,
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
