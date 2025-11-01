"use client";

/**
 * 交互区（聊天主容器）
 * - 负责布局：上方为消息历史（可滚动），下方为输入区（Textarea + 发送按钮）。
 * - 负责输入发送流程：组合输入法期间不发、Enter 发送（Shift+Enter 换行）。
 * - 处理焦点体验：发送后保持焦点；流结束时自动聚焦输入框。
 */

import React, { useCallback, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";
import { ChatHistory } from "./ChatHistory";
import { Textarea, Button, ScrollArea, Icon } from "@repo/ui";
import styles from "./InteractiveArea.module.css";
import { Send } from "lucide-react";

export const InteractiveArea: React.FC = () => {
  // 从聊天状态管理（Zustand）获取发送函数、状态与回调注册
  const { send, sending, registerOnStreamEnd } = useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = useCallback(() => {
    // 处于输入法组合阶段或正在发送中，直接忽略
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
        <div className="h-full mx-auto min-w-[30%] max-w-[600px] rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
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
              {/* 左侧：输入区（Textarea + 工具栏） */}
              <div className="flex-1 flex flex-col">
                {/* 包裹 Textarea + 工具栏，使得 focus-within 的描边覆盖两者 */}
                <div className="rounded-xl bg-primary-200/20 dark:bg-primary-400/20 focus-within:ring-2 focus-within:ring-primary-400/40 dark:focus-within:ring-primary-300/40">
                  <Textarea
                    placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
                    value={messageInput}
                    className={`text-base bg-transparent ${styles.scrollbarHidden}`}
                    focusStyle="none"
                    ref={textareaRef}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) => {
                      // Enter 发送；Shift+Enter 换行（保留默认行为）
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />

                  {/* 工具栏：紧贴底部，描边由外层 focus-within 负责 */}
                  <div className="flex items-center justify-end px-2 py-2">
                    <div className="flex gap-1">
                      <Button
                        intent="primary"
                        iconOnly
                        aria-label="发送"
                        title="发送"
                        disabled={sending || !messageInput.trim()}
                        onClick={() => void handleSend()}
                      >
                        <Icon icon={Send} size="sm" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveArea;
