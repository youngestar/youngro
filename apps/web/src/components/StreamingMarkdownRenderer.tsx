"use client";

import React from "react";
import DOMPurify from "dompurify";
import { processStreamingMarkdown } from "../lib/markdown";
import {
  advanceStreamingMarkdownState,
  createInitialStreamingMarkdownState,
  type RenderedMarkdownBlock,
  type StreamingMarkdownState,
  type TextStreamSlice,
} from "../lib/markdown/streaming";
import styles from "./MarkdownRenderer.module.css";

const STREAMING_RENDER_INTERVAL_MS = 100;

type FallbackMode = "empty" | "plain-text";

interface StreamingMarkdownViewState {
  activeTailHtml: string | null;
  activeTailSource: string;
  blocks: RenderedMarkdownBlock[];
  fallbackHtml: string | null;
  useFullFallback: boolean;
}

export interface StreamingMarkdownRendererProps {
  className?: string;
  content: string;
  fallbackMode?: FallbackMode;
  streamSlices: TextStreamSlice[];
}

function sanitizeBlock(block: RenderedMarkdownBlock): RenderedMarkdownBlock {
  return {
    ...block,
    html: DOMPurify.sanitize(block.html),
  };
}

function createInitialViewState(): StreamingMarkdownViewState {
  return {
    activeTailHtml: null,
    activeTailSource: "",
    blocks: [],
    fallbackHtml: null,
    useFullFallback: false,
  };
}

export default function StreamingMarkdownRenderer({
  className,
  content,
  fallbackMode = "plain-text",
  streamSlices,
}: StreamingMarkdownRendererProps) {
  const latestInputRef = React.useRef({
    content,
    streamSlices,
  });
  const lastRenderedContentRef = React.useRef("");
  const lastStartedAtRef = React.useRef(0);
  const pendingRef = React.useRef(false);
  const processingRef = React.useRef(false);
  const requestIdRef = React.useRef(0);
  const scheduleRenderRef = React.useRef<() => void>(() => {});
  const stateRef = React.useRef<StreamingMarkdownState>(createInitialStreamingMarkdownState());
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const useFullFallbackRef = React.useRef(false);
  const [viewState, setViewState] = React.useState<StreamingMarkdownViewState>(() =>
    createInitialViewState()
  );

  latestInputRef.current.content = content;
  latestInputRef.current.streamSlices = streamSlices;

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const invalidatePendingRequests = React.useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const commitIncrementalState = React.useCallback((nextState: StreamingMarkdownState) => {
    stateRef.current = nextState;

    setViewState((current) => {
      const nextBlocks = current.useFullFallback
        ? nextState.finalizedBlocks.map(sanitizeBlock)
        : [
            ...current.blocks,
            ...nextState.finalizedBlocks.slice(current.blocks.length).map(sanitizeBlock),
          ];

      return {
        activeTailHtml: nextState.activeTailHtml
          ? DOMPurify.sanitize(nextState.activeTailHtml)
          : null,
        activeTailSource: nextState.activeTailSource,
        blocks: nextBlocks,
        fallbackHtml: null,
        useFullFallback: false,
      };
    });
  }, []);

  const commitFullFallbackHtml = React.useCallback((html: string | null) => {
    setViewState({
      activeTailHtml: null,
      activeTailSource: "",
      blocks: [],
      fallbackHtml: html ? DOMPurify.sanitize(html) : null,
      useFullFallback: true,
    });
  }, []);

  const renderStreamingNow = React.useCallback(async () => {
    clearTimer();

    const nextContent = latestInputRef.current.content;
    if (nextContent === lastRenderedContentRef.current) {
      pendingRef.current = false;
      return;
    }

    if (processingRef.current) {
      pendingRef.current = true;
      return;
    }

    processingRef.current = true;
    lastStartedAtRef.current = Date.now();
    const requestId = ++requestIdRef.current;

    try {
      if (!useFullFallbackRef.current) {
        const result = await advanceStreamingMarkdownState(
          stateRef.current,
          nextContent,
          latestInputRef.current.streamSlices
        );

        if (requestId !== requestIdRef.current) return;

        if (result.mode === "incremental") {
          lastRenderedContentRef.current = nextContent;
          commitIncrementalState(result.state);
          return;
        }

        useFullFallbackRef.current = true;
      }

      const out = await processStreamingMarkdown(nextContent);
      if (requestId !== requestIdRef.current) return;

      lastRenderedContentRef.current = nextContent;
      commitFullFallbackHtml(out);
    } catch {
      if (requestId === requestIdRef.current) {
        commitFullFallbackHtml(null);
      }
    } finally {
      processingRef.current = false;

      if (pendingRef.current) {
        pendingRef.current = false;
        scheduleRenderRef.current();
      }
    }
  }, [clearTimer, commitFullFallbackHtml, commitIncrementalState]);

  const scheduleRender = React.useCallback(() => {
    const nextContent = latestInputRef.current.content;
    if (nextContent === lastRenderedContentRef.current) {
      pendingRef.current = false;
      return;
    }

    if (processingRef.current) {
      pendingRef.current = true;
      return;
    }

    if (timerRef.current) {
      return;
    }

    const elapsed = Date.now() - lastStartedAtRef.current;
    const delay =
      lastStartedAtRef.current === 0 ? 0 : Math.max(0, STREAMING_RENDER_INTERVAL_MS - elapsed);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void renderStreamingNow();
    }, delay);
  }, [renderStreamingNow]);

  scheduleRenderRef.current = scheduleRender;

  React.useEffect(() => {
    scheduleRender();
  }, [content, scheduleRender, streamSlices]);

  React.useEffect(() => {
    return () => {
      invalidatePendingRequests();
      clearTimer();
      pendingRef.current = false;
    };
  }, [clearTimer, invalidatePendingRequests]);

  if (viewState.useFullFallback) {
    if (viewState.fallbackHtml !== null) {
      return (
        <div
          className={className}
          data-md-block-count={0}
          data-md-render-mode="fallback-full"
          dangerouslySetInnerHTML={{ __html: viewState.fallbackHtml }}
        />
      );
    }

    if (fallbackMode === "plain-text") {
      return (
        <div
          className={`${className} ${styles.plainText}`}
          data-md-block-count={0}
          data-md-render-mode="fallback-plain-text"
        >
          {content}
        </div>
      );
    }

    return (
      <div className={className} data-md-block-count={0} data-md-render-mode="fallback-empty">
        {/** loading 占位 */}
      </div>
    );
  }

  if (viewState.blocks.length === 0 && !viewState.activeTailHtml) {
    if (viewState.activeTailSource) {
      return (
        <div
          className={`${className} ${styles.plainText}`}
          data-md-block-count={0}
          data-md-render-mode="incremental-tail-plain-text"
        >
          {viewState.activeTailSource}
        </div>
      );
    }

    if (fallbackMode === "plain-text") {
      return (
        <div
          className={`${className} ${styles.plainText}`}
          data-md-block-count={0}
          data-md-render-mode="incremental-empty-plain-text"
        >
          {content}
        </div>
      );
    }

    return (
      <div className={className} data-md-block-count={0} data-md-render-mode="incremental-empty">
        {/** loading 占位 */}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-md-block-count={viewState.blocks.length}
      data-md-render-mode="incremental"
      data-md-tail-length={viewState.activeTailSource.length}
    >
      {viewState.blocks.map((block) => (
        <div
          key={block.id}
          data-md-block-end={block.endOffset}
          data-md-block-id={block.id}
          data-md-block-kind={block.kind}
          data-md-block-reason={block.reason}
          data-md-block-start={block.startOffset}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      ))}
      {viewState.activeTailHtml ? (
        <div
          data-md-tail-mode="html"
          dangerouslySetInnerHTML={{ __html: viewState.activeTailHtml }}
        />
      ) : viewState.activeTailSource ? (
        <div className={styles.plainText} data-md-tail-mode="plain-text">
          {viewState.activeTailSource}
        </div>
      ) : null}
    </div>
  );
}
