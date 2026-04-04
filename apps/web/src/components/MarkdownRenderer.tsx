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
const STREAMING_RENDER_INTERVAL_MS = 100;

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  cacheKey?: string;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({
  content = "",
  className,
  cacheKey,
  isStreaming = false,
}: MarkdownRendererProps) {
  const [html, setHtml] = React.useState<string | null>(null);
  const latestContentRef = React.useRef(content ?? "");
  const lastStreamingRenderedContentRef = React.useRef<string>("");
  const requestIdRef = React.useRef(0);
  const streamRenderInFlightRef = React.useRef(false);
  const streamRenderPendingRef = React.useRef(false);

  React.useEffect(() => {
    latestContentRef.current = content ?? "";
  }, [content]);

  const resolvedCacheKey = React.useMemo(() => {
    if (!cacheKey || isStreaming) return null;
    return `${cacheKey}:${content ?? ""}`;
  }, [cacheKey, content, isStreaming]);

  React.useEffect(() => {
    if (!isStreaming) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const renderStreamingOnce = async () => {
      const nextContent = latestContentRef.current;
      if (nextContent === lastStreamingRenderedContentRef.current) {
        return;
      }

      if (streamRenderInFlightRef.current) {
        streamRenderPendingRef.current = true;
        return;
      }

      streamRenderInFlightRef.current = true;
      const requestId = ++requestIdRef.current;

      try {
        const out = await processMarkdownSync(nextContent);
        if (cancelled || requestId !== requestIdRef.current) return;

        const clean = DOMPurify.sanitize(out);
        lastStreamingRenderedContentRef.current = nextContent;
        setHtml(clean);
      } catch {
        // Incomplete markdown is expected while streaming.
      } finally {
        streamRenderInFlightRef.current = false;

        if (!cancelled && streamRenderPendingRef.current) {
          streamRenderPendingRef.current = false;
          void renderStreamingOnce();
        }
      }
    };

    void renderStreamingOnce();
    intervalId = setInterval(() => {
      void renderStreamingOnce();
    }, STREAMING_RENDER_INTERVAL_MS);

    return () => {
      cancelled = true;
      streamRenderPendingRef.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isStreaming]);

  React.useEffect(() => {
    if (isStreaming) return;

    let cancelled = false;
    const requestId = ++requestIdRef.current;

    if (resolvedCacheKey) {
      const cached = htmlCache.get(resolvedCacheKey);
      if (cached) {
        setHtml(cached);
        return () => {
          cancelled = true;
        };
      }
    }

    const commitHtml = (out: string) => {
      const clean = DOMPurify.sanitize(out);
      if (resolvedCacheKey) {
        htmlCache.set(resolvedCacheKey, clean);
      }
      if (!cancelled && requestId === requestIdRef.current) {
        setHtml(clean);
      }
    };

    const renderFinal = async () => {
      try {
        const out = await processMarkdown(content ?? "");
        if (cancelled || requestId !== requestIdRef.current) return;
        commitHtml(out);
      } catch {
        try {
          const out = await processMarkdownSync(content ?? "");
          if (cancelled || requestId !== requestIdRef.current) return;
          commitHtml(out);
        } catch {
          if (!cancelled && requestId === requestIdRef.current) {
            setHtml(DOMPurify.sanitize(content ?? ""));
          }
        }
      }
    };

    void renderFinal();

    return () => {
      cancelled = true;
    };
  }, [content, isStreaming, resolvedCacheKey]);

  if (html === null) return <div className={className}>{/* loading 占位 */}</div>;

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
