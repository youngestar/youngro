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
        handler as EventListener,
      );
  }, [applyActiveCardSystemPrompt]);

  return (
    <div className="h-full w-full">
      <div className="mx-auto h-full px-3 py-3">
        {/* 模仿 AIRI 首页：左内容区（预留扩展），右侧为交互区 */}
        <div className="flex gap-6 items-stretch h-full">
          <div className="flex-1 hidden md:block" />
          <div className="shrink-0 w-full md:w-auto">
            <InteractiveArea />
            <div className="mx-auto min-w-[30%] max-w-[500px] flex justify-end mt-0.5 pr-1">
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
        </div>
      </div>
    </div>
  );
}
