"use client";

import React, { useMemo } from "react";
import AiChatMessage from "./AIChatMessage";
import { useChatStore } from "@youngro/chat-zustand";
import type { BaseMessage } from "@youngro/chat-zustand";
import { useTranslation } from "react-i18next";
import { useChatAutoScroll } from "../hooks/useChatAutoScroll";

export const ChatHistory: React.FC = () => {
  const { messages, sending, streamingMessage } = useChatStore();

  // 仅展示用户可见的消息（隐藏 system 提示）
  const displayMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages]
  );

  const { endRef, scrollToBottom, showBackToBottom } = useChatAutoScroll();

  const { t } = useTranslation();

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
      {/* 底部哨兵：设置 scrollMarginBottom 防止被 sticky 按钮遮挡，确保“回到底部”能真正抵达视觉底部 */}
      <div ref={endRef} style={{ scrollMarginBottom: 56 }} />
    </div>
  );
};
