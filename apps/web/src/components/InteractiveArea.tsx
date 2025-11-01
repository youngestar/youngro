"use client";

import React, { useCallback, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";
import { ChatHistory } from "./ChatHistory";
import { Textarea, Button, ScrollArea, Icon } from "@repo/ui";
import styles from "./InteractiveArea.module.css";
import { Send, Square } from "lucide-react";

export const InteractiveArea: React.FC = () => {
  const { send, cancel, sending, registerOnStreamEnd, messages } =
    useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // 草稿恢复相关
  const lastDraftRef = useRef<string | null>(null);
  const sendStartAtRef = useRef<number>(0);
  const [awaitingSendResult, setAwaitingSendResult] = useState(false);
  // 防止 Stop 按钮引发的“立刻提交”误触（避免点击过程中 DOM 切换到 Submit 按钮后触发 submit）
  const stopClickAtRef = useRef<number>(0);

  const handleSend = useCallback(() => {
    if (isComposing || sending) return;
    const text = messageInput.trim();
    if (!text) return;
    // 先清空输入，提升交互流畅性；随后异步发送（不 await）
    lastDraftRef.current = text;
    sendStartAtRef.current = Date.now();
    setAwaitingSendResult(true);
    setMessageInput("");
    void send(text);
    // 发送后保持焦点在输入框
    textareaRef.current?.focus();
  }, [isComposing, sending, messageInput, send]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    // 若刚刚点击了 Stop（在一次点击事件序列内），忽略这次提交
    if (Date.now() - stopClickAtRef.current < 250) {
      return;
    }
    handleSend();
  };

  // 流完成时自动聚焦输入框
  React.useEffect(() => {
    const unsub = registerOnStreamEnd?.(() => {
      queueMicrotask(() => textareaRef.current?.focus());
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [registerOnStreamEnd]);

  // 发送失败自动恢复草稿：当发送结束且最后一条为 error 时恢复输入
  React.useEffect(() => {
    if (!awaitingSendResult) return;
    if (sending) return; // 仍在发送中
    setAwaitingSendResult(false);
    const last = messages?.[messages.length - 1] as
      | { role?: string; timestamp?: string }
      | undefined;
    if (last && last.role === "error") {
      // 简单基于时间的匹配，确保是本次发送的错误
      const ts = last?.timestamp;
      const lastAt = ts ? Date.parse(ts) : Date.now();
      if (!Number.isNaN(lastAt) && lastAt + 5000 >= sendStartAtRef.current) {
        setMessageInput(lastDraftRef.current || "");
      }
    }
    lastDraftRef.current = null;
  }, [awaitingSendResult, sending, messages]);

  // 本地持久化已下沉到 store（persist），组件侧无需处理

  return (
    <div className="flex flex-col items-center pt-4 w-full h-full">
      <div className="w-full h-[85svh] py-2">
        <div className="h-full mx-auto min-w-[30%] max-w-[500px] rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
          <div className="flex flex-col h-full min-h-0 w-full">
            <ScrollArea
              variant="textarea"
              thickness="md"
              className="flex-1 min-h-0 px-2"
              viewportClassName="scroll-viewport"
            >
              <div className="px-2 py-2">
                <ChatHistory />
              </div>
            </ScrollArea>
            {/* 输入区域：上下两行布局（Textarea 在上，工具栏在下） */}
            <div className="p-2">
              <form
                onSubmit={handleSubmit}
                className="grid grid-rows-[auto_min-content] gap-0 rounded-xl ring-1 ring-transparent focus-within:ring-2 focus-within:ring-primary-400/40 focus-within:ring-offset-0"
              >
                <Textarea
                  placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
                  value={messageInput}
                  className={`text-base ${styles.scrollbarHidden}`}
                  ref={textareaRef}
                  focusStyle="none"
                  aria-label="聊天输入"
                  enterKeyHint="send"
                  inputMode="text"
                  onChange={(e) => setMessageInput(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    // 优先处理 Ctrl/Cmd+Enter，避免与回车发送重复触发
                    const native =
                      e.nativeEvent as unknown as CompositionEvent & {
                        isComposing?: boolean;
                      };
                    const composing =
                      Boolean(native.isComposing) || isComposing;
                    if (composing) return;
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                {/* 工具栏：输入框下方一行，便于扩展更多按钮（表情、附件等） */}
                <div className="flex items-center justify-between gap-2 p-3 bg-primary-200/20 dark:bg-primary-400/20 rounded-b-xl">
                  <div className="flex items-center gap-1">
                    {/* 预留：表情/附件等快捷按钮 */}
                  </div>
                  <div className="flex items-center gap-1">
                    {sending ? (
                      <Button
                        intent="destructive"
                        iconOnly
                        type="button"
                        title="停止"
                        aria-label="停止"
                        onMouseDown={(ev) => {
                          // 在 mousedown 阶段阻止默认与冒泡，避免后续 click 命中替换出来的 submit 按钮
                          ev.preventDefault();
                          ev.stopPropagation();
                          stopClickAtRef.current = Date.now();
                          cancel();
                        }}
                        onClick={(ev) => {
                          // 兜底屏蔽 click（某些浏览器/屏幕阅读器合成 click）
                          ev.preventDefault();
                          ev.stopPropagation();
                        }}
                      >
                        <Icon icon={Square} />
                      </Button>
                    ) : (
                      <Button
                        intent="primary"
                        iconOnly
                        type="submit"
                        disabled={!messageInput.trim()}
                        title="发送"
                        aria-label="发送"
                      >
                        <Icon icon={Send} />
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveArea;
