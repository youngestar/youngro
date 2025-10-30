"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AiChatMessage from "./AIChatMessage";
import { useChatStore } from "@youngro/chat-zustand";
import type { BaseMessage } from "@youngro/chat-zustand";
import { useTranslation } from "react-i18next";

export const ChatHistory: React.FC = () => {
  // 可调参数：贴底阈值 / 上滑抑制时长 / token 自动滚动节流间隔
  // TODO:(最后统一修改)
  // - 收尾阶段统一检查并根据真实体验微调以下参数与滚动逻辑：
  //   - SCROLL_THRESHOLD_PX（贴底阈值）
  //   - SUPPRESSION_MS（上滑抑制时长）
  //   - TOKEN_MIN_INTERVAL_MS（token 自动滚动最小间隔）
  // - 可选改进：将 ResizeObserver 观察目标切到内容容器、补充 IntersectionObserver 进行 near-bottom 检测、提供 dev 调参开关
  const SCROLL_THRESHOLD_PX = 48; // 建议 24~48
  const SUPPRESSION_MS = 400; // 建议 300~500
  const TOKEN_MIN_INTERVAL_MS = 80; // 建议 60~120
  // 新增：控制“回到底部”按钮显示所需的最小距离（与贴底阈值分离，更易调参）
  const SHOW_BUTTON_DISTANCE_PX = 120; // 建议 96~160，根据页面高度/密度调整

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const autoScrollPinnedRef = useRef(true); // 是否允许自动贴底
  const suppressionUntilRef = useRef(0); // 抑制到期时间戳（ms）
  const lastScrollTopRef = useRef<number | null>(null); // 判定滚动方向
  const lastTokenAutoScrollAtRef = useRef(0); // token 自动滚动节流
  const [showBackToBottom, setShowBackToBottom] = useState(false);
  const { t } = useTranslation();

  const { messages, sending, streamingMessage, registerOnTokenLiteral } =
    useChatStore();

  // 仅展示用户可见的消息（隐藏 system 提示）
  const displayMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages]
  );

  // 自动滚动到底部
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
      let el: HTMLElement | null = node.parentElement;
      while (el) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if (/(auto|scroll|overlay)/.test(oy)) return el;
        el = el.parentElement;
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
      // 双层 rAF，确保本帧 DOM 变更后再滚
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
    // 参数：贴底阈值 & 上滑抑制窗口（统一常量）
    const threshold = SCROLL_THRESHOLD_PX;
    const suppressionMs = SUPPRESSION_MS;
    const onScroll = () => {
      const now = Date.now();
      const prevTop = lastScrollTopRef.current;
      const curTop = container.scrollTop;
      if (prevTop !== null) {
        const delta = curTop - prevTop;
        // 侦测上滑：delta < 0 触发抑制窗口
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
      // 仅当离底部的距离超过更大的阈值时才展示按钮，减少轻微离底时的打扰
      setShowBackToBottom(distance >= SHOW_BUTTON_DISTANCE_PX);

      // 未贴底时，禁用浏览器 Scroll Anchoring，减少位移干扰
      try {
        (
          container.style as CSSStyleDeclaration &
            Partial<Record<"overflowAnchor", string>>
        ).overflowAnchor = near ? "auto" : "none";
      } catch {
        // noop: overflow-anchor may not be supported in some environments
      }

      // 若已贴底且抑制期已过，恢复自动贴底
      if (near && now >= suppressionUntilRef.current) {
        autoScrollPinnedRef.current = true;
      }
    };
    // 初始化一次
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // 新消息进来时：仅在贴底状态下自动滚动
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container) return;
    // 即时判定是否贴底，避免状态滞后
    const threshold = SCROLL_THRESHOLD_PX; // 统一阈值
    const distance =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const near = distance <= threshold;
    const now = Date.now();
    const suppressed = now < suppressionUntilRef.current;
    if (near && !suppressed && autoScrollPinnedRef.current) {
      // 消息级自动滚动使用瞬时，减少与用户交互的拉扯
      scheduleAutoScroll("auto");
    }
  }, [displayMessages.length, scheduleAutoScroll]);

  // 监听消息被清空的场景：重置滚动状态并隐藏“回到底部”按钮，避免残留
  useEffect(() => {
    // 当用户可见的消息为空（例如仅剩 system）时，重置滚动状态并隐藏按钮
    if (displayMessages.length === 0) {
      // 重置内部状态，防止清空时仍处于“未贴底且被抑制”的错乱状态
      autoScrollPinnedRef.current = true;
      suppressionUntilRef.current = 0;
      lastScrollTopRef.current = null;
      setShowBackToBottom(false);
      // 确保视口回到底部
      scheduleAutoScroll("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMessages.length]);

  // token 流时：仅在贴底时跟随
  useEffect(() => {
    const unsub = registerOnTokenLiteral?.(() => {
      const container = scrollParentRef.current;
      if (!container) return;
      // 节流 token 自动滚动，避免高频抖动
      const minInterval = TOKEN_MIN_INTERVAL_MS; // 统一常量
      const now = Date.now();
      const elapsed = now - lastTokenAutoScrollAtRef.current;

      // 即时判定贴底与抑制期
      const threshold = SCROLL_THRESHOLD_PX; // 统一阈值
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      const near = distance <= threshold;
      const suppressed = now < suppressionUntilRef.current;
      // 距离较大时放宽节流，避免错过补滚
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleAutoScroll]);

  // 监听内容尺寸变化（例如连续换行/Markdown 渲染），在允许贴底时补滚
  useEffect(() => {
    const container = scrollParentRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const now = Date.now();
      const suppressed = now < suppressionUntilRef.current;
      if (!autoScrollPinnedRef.current || suppressed) return;
      // 只有在“贴底附近”才补滚，避免打扰用户
      const distance =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (distance <= SCROLL_THRESHOLD_PX) {
        scheduleAutoScroll("auto");
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [scheduleAutoScroll]);

  // 统一显示名来源（与流式期间一致），避免 assistant 在流式结束后变回英文
  const ASSISTANT_NAME = t("stage.chat.message.character-name.airi", {
    defaultValue: "爱丽",
  });
  const getMessageName = (role: BaseMessage["role"]) => {
    switch (role) {
      case "user":
        return t("stage.chat.role.user", { defaultValue: "user" });
      case "assistant":
        return ASSISTANT_NAME;
      case "error":
        return t("stage.chat.role.error", { defaultValue: "error" });
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col relative w-full rounded-lg space-y-2">
      {/* 普通历史消息 */}
      {displayMessages.map((message: BaseMessage, index: number) => {
        const role: "user" | "assistant" | "error" =
          message.role === "user" ||
          message.role === "assistant" ||
          message.role === "error"
            ? message.role
            : "assistant";
        const content: string =
          typeof message.content === "string" ? message.content : "";
        return (
          <AiChatMessage
            key={message.id ?? index}
            name={getMessageName(role)}
            role={role}
            content={content}
          />
        );
      })}

      {/* 流式消息（assistant 回复中） */}
      {sending && streamingMessage && (
        <AiChatMessage
          name={ASSISTANT_NAME}
          role="assistant"
          content={streamingMessage.content || ""}
          loading={!streamingMessage.content}
        />
      )}
      {/* 回到底部按钮（仅在未贴底时显示） */}
      {showBackToBottom && (
        <div className="sticky bottom-3 right-0 self-end z-10 pr-1">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium shadow-md ring-1 ring-black/5 bg-primary-600/90 text-white hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:bg-primary-400/90 dark:text-neutral-900 dark:hover:bg-primary-300 backdrop-blur-sm transition-colors"
            aria-label={t("stage.chat.action.back-to-bottom", {
              defaultValue: "回到底部",
            })}
          >
            {t("stage.chat.action.back-to-bottom", {
              defaultValue: "回到底部",
            })}
          </button>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};
