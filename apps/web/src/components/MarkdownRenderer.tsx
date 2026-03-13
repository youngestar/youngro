"use client";

/**
 * MarkdownRenderer（安全渲染 Markdown 为 HTML）
 * - 优先使用异步处理（含高亮等增强），失败时回退为同步基础处理。
 * - 注入前使用 DOMPurify 进行 XSS 清洗。
 */

import React from "react";
import DOMPurify from "dompurify";
import { processMarkdown, processMarkdownSync } from "../lib/markdownProcessor";

const htmlCache = new Map<string, string>();

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  cacheKey?: string;
}

export default function MarkdownRenderer({
  content = "",
  className,
  cacheKey,
}: MarkdownRendererProps) {
  const [html, setHtml] = React.useState<string | null>(null);
  const resolvedCacheKey = React.useMemo(() => {
    if (!cacheKey) return null;
    return `${cacheKey}:${content ?? ""}`;
  }, [cacheKey, content]);

  React.useEffect(() => {
    let mounted = true;

    if (resolvedCacheKey) {
      const cached = htmlCache.get(resolvedCacheKey);
      if (cached) {
        setHtml(cached);
        return () => {
          mounted = false;
        };
      }
    }

    setHtml(null);

    const commitHtml = (out: string) => {
      const clean = DOMPurify.sanitize(out);
      if (resolvedCacheKey) {
        htmlCache.set(resolvedCacheKey, clean);
      }
      if (mounted) {
        setHtml(clean);
      }
    };

    // async processing with highlighting when available
    processMarkdown(content ?? "")
      .then((out: string) => {
        if (!mounted) return;
        commitHtml(out);
      })
      .catch(() => {
        // fallback: sync basic processing
        processMarkdownSync(content ?? "").then((out: string) => {
          if (!mounted) return;
          commitHtml(out);
        });
      });

    return () => {
      mounted = false;
    };
  }, [content, resolvedCacheKey]);

  if (html === null) return <div className={className}>{/* loading 占位 */}</div>;

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
