"use client";

import React, { useEffect, useRef } from "react";
import AiChatMessage from "./AIChatMessage";
import { useChatStore, type Message } from "../stores/chat";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

export const ChatHistory: React.FC = () => {
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  const {
    messages,
    sending,
    streamingMessage,
    onBeforeMessageComposed,
    onTokenLiteral,
  } = useChatStore();

  // 自动滚动到底部
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatHistoryRef.current)
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    };
    onBeforeMessageComposed(() => setTimeout(scrollToBottom, 0));
    onTokenLiteral(() => setTimeout(scrollToBottom, 0));
  }, [onBeforeMessageComposed, onTokenLiteral]);

  // 根据角色获取显示名
  const getMessageName = (role: Message["role"], t: TFunction) => {
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
      {messages.map((message: Message, index: number) => (
        <AiChatMessage
          key={index}
          name={getMessageName(message.role, t)}
          role={message.role}
          content={message.content}
          loading={sending && index === messages.length - 1}
        />
      ))}

      {/* 流式消息（assistant 回复中） */}
      {sending && (
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
