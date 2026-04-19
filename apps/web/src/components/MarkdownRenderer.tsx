"use client";

/**
 * MarkdownRenderer（安全渲染 Markdown 为 HTML）
 * - 优先使用异步处理（含高亮等增强），失败时回退为同步基础处理。
 * - 注入前使用 DOMPurify 进行 XSS 清洗。
 * - 流式阶段按内容变化合并调度，避免常驻定时轮询。
 */

import React from "react";
import DOMPurify from "dompurify";
import { processMarkdown, processStreamingMarkdown } from "../lib/markdown";
import type { TextStreamSlice } from "../lib/markdown/streaming";
import styles from "./MarkdownRenderer.module.css";
import StreamingMarkdownRenderer from "./StreamingMarkdownRenderer";

/**
 * 简单的 LRU (Least Recently Used) 缓存实现
 * 借助 JS 原生 Map 会维护插入顺序的特性：
 * 每次访问/更新已存在的 key 时，先 delete 再 set，以此将其移动到迭代顺序的末尾（最新）。
 * 当容量超限时，`keys().next().value` 获取到的总是队首（最旧）的 key，将其淘汰。
 */
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    /** 标记为最近使用 (移动到 Map 末尾) */
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      /** 获取最早插入且最长时间未被访问的 key 进行淘汰 */
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }
}

/**
 * 在 AI 聊天场景下，一轮对话可能有几十上百条消息。
 * 设定容量为 200，既能满足单页长上下文平滑回顾，也能避免无限溢出导致内存泄漏。
 */
interface CachedHtmlEntry {
  contentFingerprint: string;
  html: string;
}

const htmlCache = new LRUCache<string, CachedHtmlEntry>(200);
const STREAMING_RENDER_INTERVAL_MS = 100;
const ENABLE_INCREMENTAL_STREAMING_MARKDOWN =
  process.env.NEXT_PUBLIC_ENABLE_INCREMENTAL_STREAMING_MARKDOWN !== "0";

type FallbackMode = "empty" | "plain-text";
type RenderPhase = "stream" | "final";

interface HtmlState {
  html: string | null;
  key: string;
}

interface LatestInputSnapshot {
  content: string;
  contentKey: string;
  isStreaming: boolean;
}

interface StreamingRenderState {
  inFlight: boolean;
  lastRenderedContent: string;
  lastStartedAt: number;
  pending: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

function createContentFingerprint(content: string) {
  let hash = 2166136261;

  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${content.length}:${(hash >>> 0).toString(36)}`;
}

function buildContentKey(cacheKey: string | undefined, contentFingerprint: string) {
  return `${cacheKey ?? "__content__"}:${contentFingerprint}`;
}

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  cacheKey?: string;
  fallbackMode?: FallbackMode;
  isStreaming?: boolean;
  streamSlices?: TextStreamSlice[];
}

function WholeDocumentMarkdownRenderer({
  content = "",
  className,
  cacheKey,
  fallbackMode = "plain-text",
  isStreaming = false,
}: MarkdownRendererProps) {
  const normalizedContent = content ?? "";
  const contentFingerprint = React.useMemo(
    () => createContentFingerprint(normalizedContent),
    [normalizedContent]
  );
  const contentKey = React.useMemo(
    () => buildContentKey(cacheKey, contentFingerprint),
    [cacheKey, contentFingerprint]
  );
  const resolvedCacheKey = React.useMemo(() => {
    if (!cacheKey || isStreaming) return null;
    return cacheKey;
  }, [cacheKey, isStreaming]);
  const cachedHtml = React.useMemo(() => {
    if (!resolvedCacheKey) return null;

    const entry = htmlCache.get(resolvedCacheKey);
    if (!entry || entry.contentFingerprint !== contentFingerprint) {
      return null;
    }

    return entry.html;
  }, [contentFingerprint, resolvedCacheKey]);
  const [htmlState, setHtmlState] = React.useState<HtmlState>(() => ({
    html: cachedHtml,
    key: contentKey,
  }));
  const latestInputRef = React.useRef<LatestInputSnapshot>({
    content: normalizedContent,
    contentKey,
    isStreaming,
  });
  const streamingStateRef = React.useRef<StreamingRenderState>({
    inFlight: false,
    lastRenderedContent: "",
    lastStartedAt: 0,
    pending: false,
    timer: null,
  });
  const requestIdRef = React.useRef(0);
  const renderPhaseRef = React.useRef<RenderPhase>(isStreaming ? "stream" : "final");
  const scheduleStreamingRenderRef = React.useRef<() => void>(() => {});

  // 每次 Render 时，同步最新外部 Props 到 Ref 中，供异步回调安全读取最新输入
  latestInputRef.current.content = normalizedContent;
  latestInputRef.current.contentKey = contentKey;
  latestInputRef.current.isStreaming = isStreaming;

  const currentHtml = isStreaming
    ? htmlState.html
    : htmlState.key === contentKey
      ? htmlState.html
      : cachedHtml;

  const clearStreamingRenderTimer = React.useCallback(() => {
    if (streamingStateRef.current.timer) {
      clearTimeout(streamingStateRef.current.timer);
      streamingStateRef.current.timer = null;
    }
  }, []);

  const invalidateRenderRequests = React.useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const resetQueuedStreamingWork = React.useCallback(
    (options?: { resetLastRenderedContent?: boolean }) => {
      clearStreamingRenderTimer();
      streamingStateRef.current.pending = false;
      streamingStateRef.current.lastStartedAt = 0;

      if (options?.resetLastRenderedContent) {
        streamingStateRef.current.lastRenderedContent = "";
      }
    },
    [clearStreamingRenderTimer]
  );

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

  /**
   * 提交渲染完成的 HTML 到 UI 状态
   * - 统一通过 DOMPurify 清洗防 XSS 攻击
   * - 若为最终确定状态 (非 isStreaming)，存入 LRU 缓存复用
   */
  const commitRenderedHtml = React.useCallback(
    (
      out: string,
      nextKey: string,
      options?: {
        cacheKey?: string | null;
        contentFingerprint?: string;
      }
    ) => {
      const clean = DOMPurify.sanitize(out);
      if (options?.cacheKey && options.contentFingerprint) {
        htmlCache.set(options.cacheKey, {
          contentFingerprint: options.contentFingerprint,
          html: clean,
        });
      }
      setResolvedHtmlState(clean, nextKey);
    },
    [setResolvedHtmlState]
  );

  /**
   * 立即执行一次流式渲染任务 (核心逻辑)
   * - 流式打字期间抛弃了厚重的高亮插件，强制使用 processStreamingMarkdown
   * - 配备任务 ID 竞态控制机制，丢弃在异步解析中途过期作废的任务结果
   */
  const renderStreamingNow = React.useCallback(async () => {
    clearStreamingRenderTimer();

    const nextContent = latestInputRef.current.content;
    if (nextContent === streamingStateRef.current.lastRenderedContent) {
      streamingStateRef.current.pending = false;
      return;
    }

    if (streamingStateRef.current.inFlight) {
      streamingStateRef.current.pending = true;
      return;
    }

    streamingStateRef.current.inFlight = true;
    streamingStateRef.current.lastStartedAt = Date.now();
    const requestId = ++requestIdRef.current;
    const nextContentKey = latestInputRef.current.contentKey;

    try {
      const out = await processStreamingMarkdown(nextContent);
      if (requestId !== requestIdRef.current) return;

      streamingStateRef.current.lastRenderedContent = nextContent;
      commitRenderedHtml(out, nextContentKey);
    } catch {
      /** Incomplete markdown is expected while streaming. */
    } finally {
      streamingStateRef.current.inFlight = false;

      if (streamingStateRef.current.pending) {
        streamingStateRef.current.pending = false;
        scheduleStreamingRenderRef.current();
      }
    }
  }, [clearStreamingRenderTimer, commitRenderedHtml]);

  /**
   * 安排流式更新调度 (Throttle 节流阀)
   * 在大量密集字符输入时，强制限制最低 100ms 一次的解析平滑更新画面
   * 若锁未空闲，标记 pending 并在上一轮渲染后自动补充执行这一轮。
   */
  const scheduleStreamingRender = React.useCallback(() => {
    if (!latestInputRef.current.isStreaming) return;

    const nextContent = latestInputRef.current.content;
    if (nextContent === streamingStateRef.current.lastRenderedContent) {
      streamingStateRef.current.pending = false;
      return;
    }

    if (streamingStateRef.current.inFlight) {
      streamingStateRef.current.pending = true;
      return;
    }

    if (streamingStateRef.current.timer) {
      return;
    }

    const elapsed = Date.now() - streamingStateRef.current.lastStartedAt;
    const delay =
      streamingStateRef.current.lastStartedAt === 0
        ? 0
        : Math.max(0, STREAMING_RENDER_INTERVAL_MS - elapsed);

    streamingStateRef.current.timer = setTimeout(() => {
      streamingStateRef.current.timer = null;
      void renderStreamingNow();
    }, delay);
  }, [renderStreamingNow]);

  scheduleStreamingRenderRef.current = scheduleStreamingRender;

  /**
   * 全生命周期管控：
   * 1. Streaming (在流打字模式下激活节流限时的短平快解析机制)
   * 2. Final (转为正常完整渲染后的 LRU 缓存获取和深层次带有高亮的解析)
   */
  React.useEffect(() => {
    // 已经通过 Ref 同步了 latestContent，这里保留单纯对组件生命周期的驱动记录
    const nextPhase: RenderPhase = isStreaming ? "stream" : "final";
    const previousPhase = renderPhaseRef.current;
    renderPhaseRef.current = nextPhase;

    if (nextPhase === "stream") {
      if (previousPhase !== "stream") {
        resetQueuedStreamingWork({ resetLastRenderedContent: true });
      }

      scheduleStreamingRender();
      return;
    }

    if (previousPhase === "stream") {
      invalidateRenderRequests();
      resetQueuedStreamingWork();
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
        commitRenderedHtml(out, contentKey, {
          cacheKey: resolvedCacheKey,
          contentFingerprint,
        });
      } catch {
        /** Markdown 解析失败的最终兜底 (实际上 processMarkdown 内部自己也做了安全兜底) */
        if (requestId === requestIdRef.current) {
          commitRenderedHtml(normalizedContent, contentKey);
        }
      }
    })();

    return () => {
      if (requestId === requestIdRef.current) {
        invalidateRenderRequests();
      }
    };
  }, [
    cachedHtml,
    commitRenderedHtml,
    contentKey,
    contentFingerprint,
    invalidateRenderRequests,
    isStreaming,
    normalizedContent,
    resetQueuedStreamingWork,
    resolvedCacheKey,
    scheduleStreamingRender,
    setResolvedHtmlState,
  ]);

  React.useEffect(() => {
    return () => {
      invalidateRenderRequests();
      resetQueuedStreamingWork();
    };
  }, [invalidateRenderRequests, resetQueuedStreamingWork]);

  if (currentHtml === null) {
    if (fallbackMode === "plain-text") {
      return <div className={`${className} ${styles.plainText}`}>{normalizedContent}</div>;
    }

    return <div className={className}>{/** loading 占位 */}</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: currentHtml }} />;
}

export default function MarkdownRenderer(props: MarkdownRendererProps) {
  const { content = "", fallbackMode = "plain-text", isStreaming = false, streamSlices } = props;

  if (
    ENABLE_INCREMENTAL_STREAMING_MARKDOWN &&
    isStreaming &&
    streamSlices &&
    streamSlices.length > 0
  ) {
    return (
      <StreamingMarkdownRenderer
        className={props.className}
        content={content ?? ""}
        fallbackMode={fallbackMode}
        streamSlices={streamSlices}
      />
    );
  }

  return <WholeDocumentMarkdownRenderer {...props} />;
}
