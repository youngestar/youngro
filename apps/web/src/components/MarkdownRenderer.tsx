"use client";

/**
 * MarkdownRenderer（安全渲染 Markdown 为 HTML）
 * - 优先使用异步处理（含高亮等增强），失败时回退为同步基础处理。
 * - 注入前使用 DOMPurify 进行 XSS 清洗。
 */

import React from "react";
import DOMPurify from "dompurify";
import { processMarkdown, processMarkdownSync } from "../lib/markdownProcessor";

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
}

export default function MarkdownRenderer({
  content = "",
  className,
}: MarkdownRendererProps) {
  const [html, setHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    // async processing with highlighting when available
    processMarkdown(content ?? "")
      .then((out: string) => {
        if (!mounted) return;
        // sanitize output before injecting
        const clean = DOMPurify.sanitize(out);
        setHtml(clean);
      })
      .catch(() => {
        // fallback: sync basic processing
        processMarkdownSync(content ?? "").then((out: string) => {
          const clean = DOMPurify.sanitize(out);
          if (mounted) setHtml(clean);
        });
      });

    return () => {
      mounted = false;
    };
  }, [content]);

  if (html === null)
    return <div className={className}>{/* loading 占位 */}</div>;

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
