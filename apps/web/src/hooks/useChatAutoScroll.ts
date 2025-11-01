"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";

// 将 ChatHistory 的自动滚动逻辑原封抽取为一个 Hook
// 暴露：endRef（用于定位滚动区域末端）、scrollToBottom（供“回到底部”按钮使用）、showBackToBottom（控制按钮显隐）
export function useChatAutoScroll() {
  // 可调参数：贴底阈值 / 上滑抑制时长 / token 自动滚动节流间隔
  const SCROLL_THRESHOLD_PX = 48; // 建议 24~48
  const SUPPRESSION_MS = 400; // 建议 300~500
  const TOKEN_MIN_INTERVAL_MS = 80; // 建议 60~120
  // 新增：控制“回到底部”按钮显示所需的最小距离
  const SHOW_BUTTON_DISTANCE_PX = 1200; // 建议 96~1600

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const autoScrollPinnedRef = useRef(true); // 是否允许自动贴底
  const suppressionUntilRef = useRef(0); // 抑制到期时间戳（ms）
  const lastScrollTopRef = useRef<number | null>(null); // 判定滚动方向
  const lastTokenAutoScrollAtRef = useRef(0); // token 自动滚动节流
  const [showBackToBottom, setShowBackToBottom] = useState(false);

  const { messages, registerOnTokenLiteral, sending } = useChatStore();

  // 计算滚动容器（Radix ScrollArea 的 Viewport 或最近的可滚动容器）
  useEffect(() => {
    const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      if (!node) return null;
      // 优先找 Radix Viewport
      const viewport = node.closest(
        "[data-radix-scroll-area-viewport], .scroll-viewport"
      ) as HTMLElement | null;
      if (viewport) return viewport;
      // 退化为一般可滚动祖先
      let el: HTMLElement | null = node.parentElement as HTMLElement | null;
      while (el) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if (/(auto|scroll|overlay)/.test(oy)) return el;
        el = el.parentElement as HTMLElement | null;
      }
      return null;
    };
    scrollParentRef.current = getScrollParent(endRef.current);
  }, []);

  const scrollToBottom = useMemo(
    () =>
      (behavior: ScrollBehavior = "smooth") => {
        const container = scrollParentRef.current;
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior });
        } else {
          endRef.current?.scrollIntoView({ block: "end", behavior });
        }
      },
    []
  );

  // 使用 rAF 合帧，保证布局稳定后再滚动
  const scheduleAutoScroll = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(behavior);
        });
      });
    },
    [scrollToBottom]
  );

  // 监听滚动，基于阈值判断是否贴底
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container) return;
    const threshold = SCROLL_THRESHOLD_PX;
    const suppressionMs = SUPPRESSION_MS;
    const onScroll = () => {
      const now = Date.now();
      const prevTop = lastScrollTopRef.current;
      const curTop = container.scrollTop;
      if (prevTop !== null) {
        const delta = curTop - prevTop;
        if (delta < -2) {
          suppressionUntilRef.current = now + suppressionMs;
          autoScrollPinnedRef.current = false;
        }
      }
      lastScrollTopRef.current = curTop;

      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      const near = distance <= threshold;
      isNearBottomRef.current = near;
      setShowBackToBottom(distance >= SHOW_BUTTON_DISTANCE_PX);

      try {
        (
          container.style as CSSStyleDeclaration &
            Partial<Record<"overflowAnchor", string>>
        ).overflowAnchor = near ? "auto" : "none";
      } catch {
        // ignore unsupported overflow-anchor
      }

      if (near && now >= suppressionUntilRef.current) {
        autoScrollPinnedRef.current = true;
      }
    };
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // 新消息进来时：仅在贴底状态下自动滚动
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container) return;
    const threshold = SCROLL_THRESHOLD_PX;
    const distance =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const near = distance <= threshold;
    const now = Date.now();
    const suppressed = now < suppressionUntilRef.current;
    if (near && !suppressed && autoScrollPinnedRef.current) {
      scheduleAutoScroll("auto");
    }
  }, [messages.length, scheduleAutoScroll]);

  // 当用户发送消息时：若当前状态“接近底部”（不显示回到底部按钮），则滚动到底部
  // 说明：这里使用 showBackToBottom（由滚动事件维护），避免在 DOM 更新后再计算距离导致“看起来近，但因新消息撑高而变远”的竞态。
  useEffect(() => {
    if (!sending) return;
    if (!showBackToBottom) {
      scheduleAutoScroll("auto");
    }
  }, [sending, showBackToBottom, scheduleAutoScroll]);

  // 监听消息被清空的场景：重置滚动状态并隐藏“回到底部”按钮
  useEffect(() => {
    if (messages.length === 0) {
      autoScrollPinnedRef.current = true;
      suppressionUntilRef.current = 0;
      lastScrollTopRef.current = null;
      setShowBackToBottom(false);
      scheduleAutoScroll("auto");
    }
  }, [messages.length, scheduleAutoScroll]);

  // token 流时：仅在贴底时跟随
  useEffect(() => {
    const unsub = registerOnTokenLiteral?.(() => {
      const container = scrollParentRef.current;
      if (!container) return;
      const minInterval = TOKEN_MIN_INTERVAL_MS;
      const now = Date.now();
      const elapsed = now - lastTokenAutoScrollAtRef.current;

      const threshold = SCROLL_THRESHOLD_PX;
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      const near = distance <= threshold;
      const suppressed = now < suppressionUntilRef.current;
      const bypassThrottle = distance > threshold * 2;
      if (near && !suppressed && autoScrollPinnedRef.current) {
        if (elapsed >= minInterval || bypassThrottle) {
          lastTokenAutoScrollAtRef.current = now;
          scheduleAutoScroll("auto");
        }
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [registerOnTokenLiteral, scheduleAutoScroll]);

  // 监听内容尺寸变化（例如连续换行/Markdown 渲染），在允许贴底时补滚
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const now = Date.now();
      const suppressed = now < suppressionUntilRef.current;
      if (!autoScrollPinnedRef.current || suppressed) return;
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (distance <= SCROLL_THRESHOLD_PX) {
        scheduleAutoScroll("auto");
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [scheduleAutoScroll]);

  return { endRef, scrollToBottom, showBackToBottom } as const;
}
