"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RegisterTokenFn = ((cb: () => void) => () => void) | undefined;

export function useAutoScroll(options: {
  messagesLength: number;
  registerOnTokenLiteral?: RegisterTokenFn;
  // 可选的阈值参数，若不传则使用默认值
  scrollThresholdPx?: number;
  suppressionMs?: number;
  tokenMinIntervalMs?: number;
  showButtonDistancePx?: number;
  // 是否处于流式输出中（用于在结束时做一次最终贴底滚动）
  isStreaming?: boolean;
  // 调试日志
  debug?: boolean;
}) {
  const {
    messagesLength,
    registerOnTokenLiteral,
    scrollThresholdPx,
    suppressionMs,
    tokenMinIntervalMs,
    showButtonDistancePx,
    isStreaming,
    debug,
  } = options;

  const SCROLL_THRESHOLD_PX = scrollThresholdPx ?? 48;
  const TOKEN_MIN_INTERVAL_MS = tokenMinIntervalMs ?? 80;
  const SHOW_BUTTON_DISTANCE_PX = showButtonDistancePx ?? 120;
  const SUPPRESSION_MS = suppressionMs ?? 1200;

  const endRef = useRef<HTMLDivElement | null>(null);
  // 内容容器（用于观察内容高度变化，区别于滚动容器 viewport）
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const autoScrollPinnedRef = useRef(true);
  const suppressionUntilRef = useRef<number>(0);
  const scheduledRef = useRef<boolean>(false);
  const lastTokenAutoScrollAtRef = useRef(0);
  const prevStreamingRef = useRef<boolean | undefined>(undefined);
  // 移除强依赖 IO，避免“见到哨兵即贴底”的误判导致拉扯
  const ioRef = useRef<IntersectionObserver | null>(null);

  const [showBackToBottom, setShowBackToBottom] = useState(false);

  const getScrollParent = useCallback((node: HTMLElement | null) => {
    if (!node) return null;
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
    return null;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollParentRef.current;
    // 手动回底（smooth）优先使用 sentinel，具备更好的“底部锚定”效果，避免动画过程中内容增长导致目标下移
    if (behavior === "smooth" && endRef.current) {
      endRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
      // 在 smooth 动画期间，内容可能继续增长（图片/KaTeX/代码块、content-visibility 激活等），
      // 这里做一次最多 6 帧的轻量校正，确保最终真正贴底。
      let tries = 0;
      const ensure = () => {
        const c = scrollParentRef.current;
        if (!c) return;
        const distance = c.scrollHeight - (c.scrollTop + c.clientHeight);
        const threshold = 8; // 轻量校正固定阈值，避免依赖外部常量触发闭包依赖
        if (distance <= threshold) return;
        if (++tries <= 6) {
          // 使用 auto 避免重启平滑动画，直接将末端带入视口
          endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
          requestAnimationFrame(ensure);
        }
      };
      requestAnimationFrame(ensure);
      return;
    }
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      return;
    }
    // 兜底
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: "end", behavior });
    }
  }, []);

  const scheduleAutoScroll = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (scheduledRef.current) return;
      scheduledRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scheduledRef.current = false;
          // 自动滚动一律使用 auto，减少强制对齐感
          scrollToBottom(behavior);
        });
      });
    },
    [scrollToBottom]
  );

  // 定位滚动容器；若 endRef/内容改变，尝试重新定位
  useEffect(() => {
    scrollParentRef.current = getScrollParent(endRef.current);
  }, [getScrollParent, messagesLength]);

  // scroll listener：基于“距离底部”来决定 pinned，且设置抑制窗口
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container) return;
    const threshold = SCROLL_THRESHOLD_PX;

    const onScroll = () => {
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      const near = distance <= threshold;
      isNearBottomRef.current = near;
      // 以距离作为“是否贴底”的唯一标准
      autoScrollPinnedRef.current = near;
      setShowBackToBottom(distance >= SHOW_BUTTON_DISTANCE_PX);

      // 当用户拉开一定距离，进入抑制窗口，避免自动贴底与用户对抗
      if (!near && distance >= SHOW_BUTTON_DISTANCE_PX) {
        suppressionUntilRef.current = Date.now() + SUPPRESSION_MS;
      }

      // 保持浏览器默认 anchoring；不再强制切换 overflowAnchor

      if (debug) {
        // 轻量调试：仅在开发时输出
        console.debug("[useAutoScroll] scroll", {
          distance,
          near,
          pinned: autoScrollPinnedRef.current,
        });
      }
    };
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [SCROLL_THRESHOLD_PX, SHOW_BUTTON_DISTANCE_PX, SUPPRESSION_MS, debug]);

  // 保留 IO 作为降噪辅助（仅用于把 pinned 置为 false），不将其作为“贴底”的正判
  useEffect(() => {
    const container = scrollParentRef.current;
    const sentinel = endRef.current;
    if (!container || !sentinel || typeof IntersectionObserver === "undefined")
      return;
    ioRef.current?.disconnect();
    ioRef.current = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (!e.isIntersecting) {
          autoScrollPinnedRef.current = false;
        }
        if (debug) {
          console.debug("[useAutoScroll] io", {
            intersecting: e.isIntersecting,
            ratio: e.intersectionRatio,
          });
        }
      },
      { root: container, threshold: [0] }
    );
    ioRef.current.observe(sentinel);
    return () => ioRef.current?.disconnect();
  }, [messagesLength, debug]);

  // new message：仅在 pinned 且未处于抑制窗口时自动贴底
  useEffect(() => {
    if (
      autoScrollPinnedRef.current &&
      Date.now() >= suppressionUntilRef.current
    ) {
      scheduleAutoScroll("auto");
    }
  }, [messagesLength, scheduleAutoScroll]);

  // token stream listener
  useEffect(() => {
    if (!registerOnTokenLiteral) return;
    const unsub = registerOnTokenLiteral(() => {
      const container = scrollParentRef.current;
      if (!container) return;
      const minInterval = TOKEN_MIN_INTERVAL_MS;
      const now = Date.now();
      const elapsed = now - lastTokenAutoScrollAtRef.current;
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      const distanceGate = SHOW_BUTTON_DISTANCE_PX * 2; // 超过此距离视为用户浏览历史，不强拉
      if (
        autoScrollPinnedRef.current &&
        Date.now() >= suppressionUntilRef.current &&
        distance <= distanceGate &&
        elapsed >= minInterval
      ) {
        lastTokenAutoScrollAtRef.current = now;
        scheduleAutoScroll("auto");
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [
    registerOnTokenLiteral,
    scheduleAutoScroll,
    TOKEN_MIN_INTERVAL_MS,
    SHOW_BUTTON_DISTANCE_PX,
  ]);

  // ResizeObserver compensation（优先观察内容容器，其次观察滚动容器）
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const target: Element = (contentRef.current as Element) || container;
    const ro = new ResizeObserver(() => {
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      const near = distance <= SCROLL_THRESHOLD_PX;
      // 同步 pinned 与按钮显隐（即便没有滚动事件）
      autoScrollPinnedRef.current = near;
      setShowBackToBottom(distance >= SHOW_BUTTON_DISTANCE_PX);
      if (near && Date.now() >= suppressionUntilRef.current) {
        scheduleAutoScroll("auto");
      }
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, [scheduleAutoScroll, SCROLL_THRESHOLD_PX, SHOW_BUTTON_DISTANCE_PX]);

  // 流式结束时做一次最终贴底（双 rAF 已在 scheduleAutoScroll 中实现）
  useEffect(() => {
    if (prevStreamingRef.current === undefined) {
      prevStreamingRef.current = isStreaming;
      return;
    }
    if (prevStreamingRef.current && !isStreaming) {
      // 从 true -> false 代表流结束；仅在 pinned 且未被抑制时贴底
      if (
        autoScrollPinnedRef.current &&
        Date.now() >= suppressionUntilRef.current
      )
        scheduleAutoScroll("auto");
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, scheduleAutoScroll]);

  // 捕获 img load 事件：图片加载后若 pinned 则贴底
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onLoad = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== "IMG") return;
      if (
        autoScrollPinnedRef.current &&
        Date.now() >= suppressionUntilRef.current
      )
        scheduleAutoScroll("auto");
    };
    el.addEventListener("load", onLoad as EventListener, { capture: true });
    return () =>
      el.removeEventListener("load", onLoad as EventListener, {
        capture: true,
      });
  }, [scheduleAutoScroll]);

  return useMemo(
    () => ({ endRef, contentRef, scrollToBottom, showBackToBottom }),
    [scrollToBottom, showBackToBottom]
  );
}
