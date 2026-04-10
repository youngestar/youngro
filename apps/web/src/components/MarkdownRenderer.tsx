"use client";

/**
 * MarkdownRenderer（安全渲染 Markdown 为 HTML）
 * - 优先使用异步处理（含高亮等增强），失败时回退为同步基础处理。
 * - 注入前使用 DOMPurify 进行 XSS 清洗。
 * - 流式阶段按内容变化合并调度，避免常驻定时轮询。
 */

import React from "react";
import DOMPurify from "dompurify";
import { processMarkdown, processMarkdownSync } from "../lib/markdownProcessor";
import styles from "./MarkdownRenderer.module.css";

const htmlCache = new Map<string, string>();
const STREAMING_RENDER_INTERVAL_MS = 100;

type FallbackMode = "empty" | "plain-text";
type RenderPhase = "stream" | "final";

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
  const streamRenderTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStreamingRenderStartedAtRef = React.useRef(0);
  const scheduleStreamingRenderRef = React.useRef<() => void>(() => {});
  const renderPhaseRef = React.useRef<RenderPhase>(isStreaming ? "stream" : "final");
  const currentHtml = isStreaming
    ? htmlState.html
    : htmlState.key === contentKey
      ? htmlState.html
      : cachedHtml;

  const clearStreamingRenderTimer = React.useCallback(() => {
    if (streamRenderTimerRef.current) {
      clearTimeout(streamRenderTimerRef.current);
      streamRenderTimerRef.current = null;
    }
  }, []);

  const setResolvedHtmlState = React.useCallback((nextHtml: string | null, nextKey: string) => {
    setHtmlState((current) => {
      if (current.key === nextKey && current.html === nextHtml) {
        return current;
      }

      return {
        html: nextHtml,
        key: nextKey,
      };
    });
  }, []);

  const commitRenderedHtml = React.useCallback(
    (out: string, nextKey: string, nextCacheKey?: string | null) => {
      const clean = DOMPurify.sanitize(out);
      if (nextCacheKey) {
        htmlCache.set(nextCacheKey, clean);
      }
      setResolvedHtmlState(clean, nextKey);
    },
    [setResolvedHtmlState]
  );

  const renderStreamingNow = React.useCallback(async () => {
    clearStreamingRenderTimer();

    const nextContent = latestContentRef.current;
    if (nextContent === lastStreamingRenderedContentRef.current) {
      streamRenderPendingRef.current = false;
      return;
    }

    if (streamRenderInFlightRef.current) {
      streamRenderPendingRef.current = true;
      return;
    }

    streamRenderInFlightRef.current = true;
    lastStreamingRenderStartedAtRef.current = Date.now();
    const requestId = ++requestIdRef.current;
    const nextContentKey = buildContentKey(cacheKey, nextContent);

    try {
      const out = await processMarkdownSync(nextContent);
      if (requestId !== requestIdRef.current) return;

      lastStreamingRenderedContentRef.current = nextContent;
      commitRenderedHtml(out, nextContentKey);
    } catch {
      // Incomplete markdown is expected while streaming.
    } finally {
      streamRenderInFlightRef.current = false;

      if (streamRenderPendingRef.current) {
        streamRenderPendingRef.current = false;
        scheduleStreamingRenderRef.current();
      }
    }
  }, [cacheKey, clearStreamingRenderTimer, commitRenderedHtml]);

  const scheduleStreamingRender = React.useCallback(() => {
    if (!isStreaming) return;

    const nextContent = latestContentRef.current;
    if (nextContent === lastStreamingRenderedContentRef.current) {
      streamRenderPendingRef.current = false;
      return;
    }

    if (streamRenderInFlightRef.current) {
      streamRenderPendingRef.current = true;
      return;
    }

    if (streamRenderTimerRef.current) {
      return;
    }

    const elapsed = Date.now() - lastStreamingRenderStartedAtRef.current;
    const delay =
      lastStreamingRenderStartedAtRef.current === 0
        ? 0
        : Math.max(0, STREAMING_RENDER_INTERVAL_MS - elapsed);

    streamRenderTimerRef.current = setTimeout(() => {
      streamRenderTimerRef.current = null;
      void renderStreamingNow();
    }, delay);
  }, [isStreaming, renderStreamingNow]);

  scheduleStreamingRenderRef.current = scheduleStreamingRender;

  React.useEffect(() => {
    latestContentRef.current = normalizedContent;

    const nextPhase: RenderPhase = isStreaming ? "stream" : "final";
    const previousPhase = renderPhaseRef.current;
    renderPhaseRef.current = nextPhase;

    if (nextPhase === "stream") {
      if (previousPhase !== "stream") {
        clearStreamingRenderTimer();
        streamRenderPendingRef.current = false;
        lastStreamingRenderedContentRef.current = "";
        lastStreamingRenderStartedAtRef.current = 0;
      }

      scheduleStreamingRender();
      return;
    }

    if (previousPhase === "stream") {
      requestIdRef.current += 1;
      clearStreamingRenderTimer();
      streamRenderPendingRef.current = false;
      lastStreamingRenderStartedAtRef.current = 0;
    }

    if (cachedHtml !== null) {
      setResolvedHtmlState(cachedHtml, contentKey);
      return;
    }

    const requestId = ++requestIdRef.current;

    void (async () => {
      try {
        const out = await processMarkdown(normalizedContent);
        if (requestId !== requestIdRef.current) return;
        commitRenderedHtml(out, contentKey, resolvedCacheKey);
      } catch {
        try {
          const out = await processMarkdownSync(normalizedContent);
          if (requestId !== requestIdRef.current) return;
          commitRenderedHtml(out, contentKey, resolvedCacheKey);
        } catch {
          if (requestId === requestIdRef.current) {
            commitRenderedHtml(normalizedContent, contentKey);
          }
        }
      }
    })();

    return () => {
      if (requestId === requestIdRef.current) {
        requestIdRef.current += 1;
      }
    };
  }, [
    cachedHtml,
    clearStreamingRenderTimer,
    commitRenderedHtml,
    contentKey,
    isStreaming,
    normalizedContent,
    resolvedCacheKey,
    scheduleStreamingRender,
    setResolvedHtmlState,
  ]);

  React.useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      clearStreamingRenderTimer();
      streamRenderPendingRef.current = false;
    };
  }, [clearStreamingRenderTimer]);

  if (currentHtml === null) {
    if (fallbackMode === "plain-text") {
      return <div className={`${className} ${styles.plainText}`}>{normalizedContent}</div>;
    }

    return <div className={className}>{/* loading 占位 */}</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: currentHtml }} />;
}
