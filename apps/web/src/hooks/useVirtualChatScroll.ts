"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

type VirtualScrollBehavior = "auto" | "smooth";

export function useVirtualChatScroll(itemCount: number, sending: boolean) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const itemCountRef = useRef(itemCount);
  const initializedRef = useRef(false);
  const isSmoothScrollingRef = useRef(false);
  const [showBackToBottom, setShowBackToBottom] = useState(false);

  useEffect(() => {
    itemCountRef.current = itemCount;
  }, [itemCount]);

  const scrollToBottom = useCallback((behavior: VirtualScrollBehavior = "smooth") => {
    const lastIndex = itemCountRef.current - 1;
    if (!virtuosoRef.current || lastIndex < 0) return;

    if (behavior === "smooth") {
      isSmoothScrollingRef.current = true;
    } else {
      isSmoothScrollingRef.current = false;
    }

    virtuosoRef.current.scrollToIndex({ index: lastIndex, align: "end", behavior });
    setShowBackToBottom(false);

    if (behavior === "smooth") {
      window.setTimeout(() => {
        isSmoothScrollingRef.current = false;
      }, 1000);
    }
  }, []);

  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    if (isSmoothScrollingRef.current && !atBottom) {
      return;
    }

    if (atBottom) {
      isSmoothScrollingRef.current = false;
    }

    setShowBackToBottom(!atBottom && itemCountRef.current > 0);
  }, []);

  useEffect(() => {
    if (!initializedRef.current && itemCount > 0) {
      initializedRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    }
  }, [itemCount, scrollToBottom]);

  useEffect(() => {
    if (sending && itemCount > 0) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [itemCount, scrollToBottom, sending]);

  useEffect(() => {
    if (itemCount <= 1) {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
      setShowBackToBottom(false);
    }
  }, [itemCount, scrollToBottom]);

  return {
    virtuosoRef,
    showBackToBottom,
    handleAtBottomStateChange,
    scrollToBottom,
  } as const;
}
