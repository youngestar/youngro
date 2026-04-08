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

type FallbackMode = "empty" | "plain-text";

interface HtmlState {
  html: string | null;
  key: string;
}

function buildContentKey(cacheKey: string | undefined, content: string) {
  return `${cacheKey ?? "__content__"}:${content}`;
}

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  cacheKey?: string;
  fallbackMode?: FallbackMode;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({
  content = "",
  className,
  cacheKey,
  fallbackMode = "empty",
  isStreaming = false,
}: MarkdownRendererProps) {
  const normalizedContent = content ?? "";
  const contentKey = React.useMemo(
    () => buildContentKey(cacheKey, normalizedContent),
    [cacheKey, normalizedContent]
  );
  const resolvedCacheKey = React.useMemo(() => {
    if (!cacheKey || isStreaming) return null;
    return contentKey;
  }, [cacheKey, contentKey, isStreaming]);
  const cachedHtml = React.useMemo(
    () => (resolvedCacheKey ? (htmlCache.get(resolvedCacheKey) ?? null) : null),
    [resolvedCacheKey]
  );
  const [htmlState, setHtmlState] = React.useState<HtmlState>(() => ({
    html: cachedHtml,
    key: contentKey,
  }));
  const latestContentRef = React.useRef(normalizedContent);
  const lastStreamingRenderedContentRef = React.useRef<string>("");
  const requestIdRef = React.useRef(0);
  const streamRenderInFlightRef = React.useRef(false);
  const streamRenderPendingRef = React.useRef(false);
  const currentHtml = isStreaming
    ? htmlState.html
    : htmlState.key === contentKey
      ? htmlState.html
      : cachedHtml;

  React.useEffect(() => {
    latestContentRef.current = normalizedContent;
  }, [normalizedContent]);

  React.useEffect(() => {
    if (isStreaming) {
      return;
    }

    setHtmlState((current) => {
      if (current.key === contentKey && current.html === cachedHtml) {
        return current;
      }

      return {
        html: cachedHtml,
        key: contentKey,
      };
    });
  }, [cachedHtml, contentKey, isStreaming]);

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
      const nextContentKey = buildContentKey(cacheKey, nextContent);

      try {
        const out = await processMarkdownSync(nextContent);
        if (cancelled || requestId !== requestIdRef.current) return;

        const clean = DOMPurify.sanitize(out);
        lastStreamingRenderedContentRef.current = nextContent;
        setHtmlState({ html: clean, key: nextContentKey });
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
  }, [cacheKey, isStreaming]);

  React.useEffect(() => {
    if (isStreaming) return;

    let cancelled = false;
    const requestId = ++requestIdRef.current;

    if (cachedHtml !== null) {
      return () => {
        cancelled = true;
      };
    }

    const commitHtml = (out: string) => {
      const clean = DOMPurify.sanitize(out);
      if (resolvedCacheKey) {
        htmlCache.set(resolvedCacheKey, clean);
      }
      if (!cancelled && requestId === requestIdRef.current) {
        setHtmlState({ html: clean, key: contentKey });
      }
    };

    const renderFinal = async () => {
      try {
        const out = await processMarkdown(normalizedContent);
        if (cancelled || requestId !== requestIdRef.current) return;
        commitHtml(out);
      } catch {
        try {
          const out = await processMarkdownSync(normalizedContent);
          if (cancelled || requestId !== requestIdRef.current) return;
          commitHtml(out);
        } catch {
          if (!cancelled && requestId === requestIdRef.current) {
            setHtmlState({
              html: DOMPurify.sanitize(normalizedContent),
              key: contentKey,
            });
          }
        }
      }
    };

    void renderFinal();

    return () => {
      cancelled = true;
    };
  }, [cachedHtml, contentKey, isStreaming, normalizedContent, resolvedCacheKey]);

  if (currentHtml === null) {
    if (fallbackMode === "plain-text") {
      return (
        <div className={className} style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
          {normalizedContent}
        </div>
      );
    }

    return <div className={className}>{/* loading 占位 */}</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: currentHtml }} />;
}
