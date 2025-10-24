"use client";

import React, { useEffect, useRef } from "react";
import AiChatMessage from "./AIChatMessage";
import { useChatStore } from "@youngro/chat-zustand";
import type { BaseMessage } from "@youngro/chat-zustand";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

export const ChatHistory: React.FC = () => {
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  const { messages, sending, streamingMessage, registerOnTokenLiteral } =
    useChatStore();

  // 自动滚动到底部
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatHistoryRef.current)
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    };
    // 当有新 token 流入时滚动
    registerOnTokenLiteral?.(() => setTimeout(scrollToBottom, 0));
    // 当消息数量变化时滚动
    setTimeout(scrollToBottom, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // 根据角色获取显示名
  const getMessageName = (role: BaseMessage["role"], t: TFunction) => {
    switch (role) {
      case "user":
        return t("stage.chat.message.character-name.you");
      case "assistant":
        return t("stage.chat.message.character-name.airi");
      case "error":
        return t("stage.chat.message.character-name.core-system");
      default:
        return "";
    }
  };

  return (
    <div
      ref={chatHistoryRef}
      className="flex flex-col relative h-full w-full overflow-y-auto rounded-lg px-2 py-2 space-y-2"
    >
      {/* 普通历史消息 */}
      {messages.map((message: BaseMessage, index: number) => {
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
            key={index}
            name={getMessageName(role, t)}
            role={role}
            content={content}
            loading={sending && index === messages.length - 1}
          />
        );
      })}

      {/* 流式消息（assistant 回复中） */}
      {sending && streamingMessage && (
        <AiChatMessage
          name={t("stage.chat.message.character-name.airi")}
          role="assistant"
          content={streamingMessage.content || ""}
          loading={!streamingMessage.content}
        />
      )}
    </div>
  );
};
