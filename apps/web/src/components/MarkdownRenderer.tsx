"use client";

import React from "react";
import DOMPurify from "dompurify";
import {
  processMarkdown,
  processMarkdownSync,
  processMarkdownLite,
} from "../lib/markdownProcessor";

export interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  // 流式期间使用轻量渲染，结束后再升级为完整渲染
  streaming?: boolean;
}

export default function MarkdownRenderer({
  content = "",
  className,
  streaming = false,
}: MarkdownRendererProps) {
  const [html, setHtml] = React.useState<string | null>(null);
  const lastFullHtmlRef = React.useRef<string>("");
  const debounceTimerRef = React.useRef<number | null>(null);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  const getScrollParent = React.useCallback((node: HTMLElement | null) => {
    if (!node) return null as HTMLElement | null;
    const viewport = node.closest(
      "[data-radix-scroll-area-viewport], .scroll-viewport"
    ) as HTMLElement | null;
    if (viewport) return viewport;
    let el: HTMLElement | null = node.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if (/(auto|scroll|overlay)/.test(oy)) return el;
      el = el.parentElement;
    }
    return null as HTMLElement | null;
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const container = getScrollParent(hostRef.current);
    const distanceBefore = container
      ? container.scrollHeight - (container.scrollTop + container.clientHeight)
      : 0;

    const runFull = () => {
      processMarkdown(content ?? "")
        .then((out: string) => {
          if (!mounted) return;
          const clean = DOMPurify.sanitize(out);
          lastFullHtmlRef.current = clean;
          setHtml((prev) => (prev === clean ? prev : clean));
          // 升级为全量渲染后，使用双 rAF 做滚动补偿，防止视口抖动
          if (container) {
            const NEAR_BOTTOM_THRESHOLD = 64;
            if (distanceBefore <= NEAR_BOTTOM_THRESHOLD) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const after =
                    container.scrollHeight -
                    (container.scrollTop + container.clientHeight);
                  const adjust = after - distanceBefore;
                  if (adjust !== 0) {
                    container.scrollTop += adjust;
                  }
                });
              });
            }
          }
        })
        .catch(() => {
          processMarkdownSync(content ?? "").then((out: string) => {
            const clean = DOMPurify.sanitize(out);
            lastFullHtmlRef.current = clean;
            if (mounted) setHtml((prev) => (prev === clean ? prev : clean));
            if (container) {
              const NEAR_BOTTOM_THRESHOLD = 64;
              if (distanceBefore <= NEAR_BOTTOM_THRESHOLD) {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const after =
                      container.scrollHeight -
                      (container.scrollTop + container.clientHeight);
                    const adjust = after - distanceBefore;
                    if (adjust !== 0) {
                      container.scrollTop += adjust;
                    }
                  });
                });
              }
            }
          });
        });
    };

    const runLite = () => {
      processMarkdownLite(content ?? "")
        .then((out: string) => {
          if (!mounted) return;
          const clean = DOMPurify.sanitize(out);
          setHtml((prev) => (prev === clean ? prev : clean));
        })
        .catch(() => {
          // 即便 lite 失败也不影响，保持现有渲染
        });
    };

    // 流式期间：轻量渲染，做一个小的去抖（降低抖动频率）
    if (streaming) {
      if (debounceTimerRef.current)
        window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(runLite, 120);
    } else {
      // 非流式：做完整渲染；若 lite 渲染过，升级为 full
      runFull();
    }

    return () => {
      mounted = false;
      if (debounceTimerRef.current)
        window.clearTimeout(debounceTimerRef.current);
    };
  }, [content, streaming, getScrollParent]);

  if (html === null)
    return (
      <div ref={hostRef} className={className}>
        {/* loading */}
      </div>
    );

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ contentVisibility: "auto" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
