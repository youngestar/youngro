"use client";

import React, { useEffect, useRef } from "react";
import AiChatMessage from "./AIChatMessage";
import { useChatStore } from "@youngro/chat-zustand";
import type { BaseMessage } from "@youngro/chat-zustand";
import { useTranslation } from "react-i18next";

export const ChatHistory: React.FC = () => {
  const endRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  const { messages, sending, streamingMessage, registerOnTokenLiteral } =
    useChatStore();

  // 自动滚动到底部
  useEffect(() => {
    const scrollToBottom = () => {
      endRef.current?.scrollIntoView({ block: "end" });
    };
    // 当有新 token 流入时滚动
    registerOnTokenLiteral?.(() => setTimeout(scrollToBottom, 0));
    // 当消息数量变化时滚动
    setTimeout(scrollToBottom, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // 根据角色获取显示名
  const getMessageName = (role: BaseMessage["role"]) => {
    // TODO: i18n
    switch (role) {
      case "user":
        return "user";
      case "assistant":
        return "assistant";
      case "error":
        return "error";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col relative w-full rounded-lg space-y-2">
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
            name={getMessageName(role)}
            role={role}
            content={content}
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
      <div ref={endRef} />
    </div>
  );
};
