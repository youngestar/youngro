"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";

// 将 ChatHistory 的自动滚动逻辑原封抽取为一个 Hook
// 暴露：endRef（用于定位滚动区域末端）、scrollToBottom（供“回到底部”按钮使用）、showBackToBottom（控制按钮显隐）
export function useChatAutoScroll() {
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const [showBackToBottom, setShowBackToBottom] = useState(false);

  // 使用 ref 来存储“是否应该自动滚动”的状态，避免闭包陷阱和频繁重渲染
  // 默认为 true，即初始状态下允许自动滚动
  const shouldAutoScrollRef = useRef(true);
  // 标记是否正在进行平滑滚动（由“回到底部”触发），在此期间不应显示按钮
  const isSmoothScrollingRef = useRef(false);

  const { messages, registerOnTokenLiteral, sending } = useChatStore();

  // 初始化：寻找滚动容器并绑定监听
  useEffect(() => {
    const element = endRef.current;
    if (!element) return;

    // 尝试查找滚动容器 (兼容 Radix UI ScrollArea 或普通容器)
    const parent =
      (element.closest(".scroll-viewport") as HTMLElement) ||
      (element.closest("[data-radix-scroll-area-viewport]") as HTMLElement) ||
      element.parentElement;

    if (!parent) return;
    scrollParentRef.current = parent;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;

      // 如果内容没有溢出（不需要滚动），则永远不显示按钮，并保持自动滚动状态
      if (scrollHeight <= clientHeight) {
        setShowBackToBottom(false);
        shouldAutoScrollRef.current = true;
        return;
      }

      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      // 阈值：距离底部多少像素内视为“贴底”
      const isAtBottom = distanceToBottom < 100;

      // 如果正在进行平滑滚动（由按钮触发），则强制隐藏按钮并保持自动滚动状态
      // 直到滚动到底部（isAtBottom 为 true）才解除锁定
      if (isSmoothScrollingRef.current) {
        setShowBackToBottom(false);
        shouldAutoScrollRef.current = true;
        if (isAtBottom) {
          isSmoothScrollingRef.current = false;
        }
        return;
      }

      // 如果用户向上滚动离开了底部，显示按钮，并暂停自动滚动
      // 如果用户回到了底部，隐藏按钮，并恢复自动滚动
      setShowBackToBottom(!isAtBottom);
      shouldAutoScrollRef.current = isAtBottom;
    };

    parent.addEventListener("scroll", handleScroll);
    // 初始化检查
    handleScroll();

    // 监听容器大小变化（如窗口缩放）
    const ro = new ResizeObserver(() => {
      // 重新检查滚动状态（例如窗口变大导致不再溢出，应隐藏按钮）
      handleScroll();

      if (shouldAutoScrollRef.current) {
        parent.scrollTo({ top: parent.scrollHeight, behavior: "auto" });
      }
    });
    ro.observe(parent);

    return () => {
      parent.removeEventListener("scroll", handleScroll);
      ro.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollParentRef.current;
    if (container) {
      // 手动点击回到底部时，强制开启自动滚动
      shouldAutoScrollRef.current = true;
      container.scrollTo({ top: container.scrollHeight, behavior });
      // 立即更新 UI 状态，不必等待 scroll 事件回调
      setShowBackToBottom(false);

      if (behavior === "smooth") {
        isSmoothScrollingRef.current = true;
        // 安全机制：1秒后强制重置平滑滚动状态，防止因中断等原因导致状态卡死
        setTimeout(() => {
          isSmoothScrollingRef.current = false;
        }, 1000);
      }
    } else {
      endRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // 执行自动滚动的核心函数
  const performAutoScroll = useCallback(() => {
    if (shouldAutoScrollRef.current) {
      const container = scrollParentRef.current;
      if (container) {
        // 使用 requestAnimationFrame 避免在高频 token 更新时阻塞主线程
        requestAnimationFrame(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
        });
      }
    }
  }, []);

  // 1. 监听消息列表长度变化
  useEffect(() => {
    performAutoScroll();
  }, [messages.length, performAutoScroll]);

  // 2. 监听流式输出 Token
  useEffect(() => {
    const unsub = registerOnTokenLiteral?.(() => {
      performAutoScroll();
    });
    return () => unsub?.();
  }, [registerOnTokenLiteral, performAutoScroll]);

  // 3. 当开始发送消息时，强制滚动到底部
  useEffect(() => {
    if (sending) {
      shouldAutoScrollRef.current = true;
      scrollToBottom("smooth");
    }
  }, [sending, scrollToBottom]);

  return { endRef, scrollToBottom, showBackToBottom } as const;
}
