"use client";

import React, { useCallback, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";
import { ChatHistory } from "./ChatHistory";
import { Textarea, Button } from "@repo/ui";

export const InteractiveArea: React.FC = () => {
  const { send, cleanup, sending } = useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const handleSend = useCallback(async () => {
    const text = messageInput.trim();
    if (!text || isComposing) return;
    await send(text);
    setMessageInput("");
  }, [isComposing, messageInput, send]);

  return (
    <div className="flex flex-col items-center pt-4 w-full h-full">
      <div className="w-full max-h-[85vh] py-4">
        <div className="flex flex-col h-full w-full overflow-y-auto rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
          <div className="flex-1 min-h-[40vh]">
            <ChatHistory />
          </div>
          <div className="flex gap-2 p-2">
            <Textarea
              placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              intent="primary"
              disabled={sending || !messageInput.trim()}
              onClick={() => void handleSend()}
            >
              发送
            </Button>
            <Button intent="default" title="清空历史" onClick={() => cleanup()}>
              清空
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveArea;
