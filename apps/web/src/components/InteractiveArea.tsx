"use client";

import React, { useCallback, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";
import { ChatHistory } from "./ChatHistory";
import { Textarea, Button, ScrollArea } from "@repo/ui";

export const InteractiveArea: React.FC = () => {
  const { send, cleanup, cancel, sending, messages, registerOnStreamEnd } =
    useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = useCallback(() => {
    if (isComposing || sending) return;
    const text = messageInput.trim();
    if (!text) return;
    // 先清空输入，提升交互流畅性；随后异步发送（不 await）
    setMessageInput("");
    void send(text);
    // 发送后保持焦点在输入框
    textareaRef.current?.focus();
  }, [isComposing, sending, messageInput, send]);

  // 流完成时自动聚焦输入框
  React.useEffect(() => {
    const unsub = registerOnStreamEnd?.(() => {
      queueMicrotask(() => textareaRef.current?.focus());
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [registerOnStreamEnd]);

  // 本地持久化已下沉到 store（persist），组件侧无需处理

  return (
    <div className="flex flex-col items-center pt-4 w-full h-full">
      <div className="w-full h-[85dvh] py-4">
        <div className="h-full mx-auto min-w-[30%] max-w-[500px] rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
          <div className="flex flex-col h-full w-full">
            <ScrollArea
              variant="textarea"
              thickness="md"
              className="flex-1 min-h-[40vh] px-2"
              viewportClassName="scroll-viewport"
            >
              <div className="px-2 py-2">
                <ChatHistory />
              </div>
            </ScrollArea>
            <div className="flex gap-2 p-2">
              <Textarea
                placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
                value={messageInput}
                className="text-base"
                ref={textareaRef}
                onChange={(e) => setMessageInput(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                  // 支持 Ctrl/Cmd + Enter 发送
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
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
              <Button
                intent="default"
                title="清空历史"
                disabled={sending || messages.length === 0}
                onClick={() => cleanup()}
              >
                清空
              </Button>
              {sending && (
                <Button
                  intent="destructive"
                  title="停止"
                  onClick={() => cancel()}
                >
                  停止
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveArea;
