"use client";

/**
 * ChatHistory（消息历史列表）
 * - 仅渲染用户可见的消息（过滤 system）。
 * - 在 assistant 正在流式回复时，额外渲染一条“进行中”的消息。
 * - 将消息整理为虚拟列表数据，交给 VirtualChatList 渲染。
 */

import React, { useMemo } from "react";
import { useChatStore } from "@youngro/feature-chat";
import type { BaseMessage } from "@youngro/feature-chat";
import { useTranslation } from "react-i18next";
import { VirtualChatList, type VirtualChatItem } from "./VirtualChatList";

export const ChatHistory: React.FC = () => {
  const { messages, sending, streamingMessage } = useChatStore();

  // 仅展示用户可见的消息（隐藏 system 提示）
  // 过滤隐藏 system 消息，避免在 UI 中暴露系统提示词
  const displayMessages = useMemo(() => messages.filter((m) => m.role !== "system"), [messages]);

  const { t } = useTranslation();

  // 统一显示名来源（与流式期间一致），避免 assistant 在流式结束后变回英文
  const ASSISTANT_NAME = t("stage.chat.message.character-name.airi", {
    defaultValue: "爱丽",
  });
  const getMessageName = React.useCallback(
    (role: BaseMessage["role"]) => {
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
    },
    [ASSISTANT_NAME, t]
  );

  const items = useMemo<VirtualChatItem[]>(() => {
    const mapped: VirtualChatItem[] = displayMessages.map((message: BaseMessage) => {
      const role: "user" | "assistant" | "error" =
        message.role === "user" || message.role === "assistant" || message.role === "error"
          ? message.role
          : "assistant";

      return {
        id: message.id,
        kind: "history",
        name: getMessageName(role),
        role,
        content: Array.isArray(message.content)
          ? (message.content as VirtualChatItem["content"])
          : typeof message.content === "string"
            ? message.content
            : "",
        cacheKey: message.id,
      };
    });

    if (sending && streamingMessage) {
      mapped.push({
        id: streamingMessage.id,
        kind: "streaming",
        name: ASSISTANT_NAME,
        role: "assistant",
        content: streamingMessage.content || "",
        loading: !streamingMessage.content,
      });
    }

    return mapped;
  }, [ASSISTANT_NAME, displayMessages, getMessageName, sending, streamingMessage]);

  return <VirtualChatList items={items} sending={sending} />;
};
