"use client";

import InteractiveArea from "../../src/components/InteractiveArea";
import { Button, Icon } from "@repo/ui";
import { useChatStore } from "@youngro/chat-zustand";
import { Trash2 } from "lucide-react";
import React from "react";

export default function Home() {
  const { cleanup, sending, messages, applyActiveCardSystemPrompt } =
    useChatStore();

  // 监听 Youngro 卡片激活事件，实时刷新系统提示
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => applyActiveCardSystemPrompt();
    window.addEventListener("youngro-card-activated", handler as EventListener);
    return () =>
      window.removeEventListener(
        "youngro-card-activated",
        handler as EventListener
      );
  }, [applyActiveCardSystemPrompt]);

  return (
    <div className="p-4">
      <InteractiveArea />
      {/* 外部清空按钮：位于 InteractiveArea 正下方，略微外移 */}
      <div className="mx-auto min-w-[30%] max-w-[500px] flex justify-end mt-0.25 pr-1">
        <Button
          intent="default"
          iconOnly
          title="清空历史"
          aria-label="清空历史"
          disabled={
            sending ||
            (Array.isArray(messages) &&
              messages.every((m) => m.role === "system"))
          }
          onClick={() => cleanup()}
        >
          <Icon icon={Trash2} />
        </Button>
      </div>
    </div>
  );
}
