"use client";

import React from "react";
import { Button } from "@repo/ui";
import { useChatStore } from "@youngro/chat-zustand";

export const ChatToolbar: React.FC = () => {
  const { cleanup, sending, messages } = useChatStore();

  return (
    <div className="flex items-center justify-end px-2 py-1">
      <Button
        intent="default"
        title="清空历史"
        disabled={
          sending ||
          (Array.isArray(messages) &&
            messages.every((m) => m.role === "system"))
        }
        onClick={() => cleanup()}
      >
        清空
      </Button>
    </div>
  );
};

export default ChatToolbar;
