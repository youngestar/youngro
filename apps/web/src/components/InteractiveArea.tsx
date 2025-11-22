"use client";

/**
 * 交互区（聊天主容器）
 * - 上方显示消息历史，下方提供输入与发送。
 */

import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useChatStore } from "@youngro/chat-zustand";
import { ChatHistory } from "./ChatHistory";
import { Textarea, Button, ScrollArea, Icon } from "@repo/ui";
import styles from "./InteractiveArea.module.css";
import { Send } from "lucide-react";
import {
  useProvidersStore,
  useProvidersHydrate,
} from "../store/providersStore";

export const InteractiveArea: React.FC = () => {
  const { send, sending, registerOnStreamEnd } = useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useProvidersHydrate();
  const providers = useProvidersStore((s) => s.getProvidersByCategory("chat"));
  const fetchModels = useProvidersStore((s) => s.fetchModels);
  const [selectedProvider, setSelectedProvider] = useState<string>("deepseek");
  const providerState = useProvidersStore((s) =>
    s.getProvider(selectedProvider)
  );
  const models = useMemo(
    () => providerState?.resources.items ?? [],
    [providerState?.resources.items]
  );
  const providerConfig = useMemo(() => {
    const cfg = providerState?.config;
    return cfg ? { ...cfg } : undefined;
  }, [providerState?.config]);
  const [selectedModel, setSelectedModel] = useState<string>("");

  const handleSend = useCallback(() => {
    if (isComposing || sending) return;
    const text = messageInput.trim();
    if (!text) return;
    const modelToUse = selectedModel || models[0]?.id || undefined;
    setMessageInput("");
    void send(text, {
      model: modelToUse,
      providerId: selectedProvider,
      providerConfig,
    });
    textareaRef.current?.focus();
  }, [
    isComposing,
    sending,
    messageInput,
    send,
    selectedModel,
    selectedProvider,
    models,
    providerConfig,
  ]);

  useEffect(() => {
    const unsub = registerOnStreamEnd?.(() => {
      queueMicrotask(() => textareaRef.current?.focus());
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [registerOnStreamEnd]);

  useEffect(() => {
    if (selectedProvider) void fetchModels(selectedProvider);
  }, [selectedProvider, fetchModels]);

  useEffect(() => {
    if (models.length && !selectedModel) {
      const first = models[0];
      if (first) setSelectedModel(first.id);
    }
  }, [models, selectedModel]);

  return (
    <div className="flex flex-col items-center pt-4 w-full h-full">
      <div className="w-full h-[85dvh] py-4">
        <div className="h-full mx-auto min-w-[30%] max-w-[600px] rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
          <div className="flex flex-col h-full w-full">
            <ScrollArea
              variant="textarea"
              thickness="md"
              className="flex-1 min-h-[40vh] px-2 [&_[data-orientation=horizontal]]:!hidden"
              viewportClassName="scroll-viewport !overflow-x-hidden"
            >
              <div className="px-2 py-2 max-w-full">
                <ChatHistory />
              </div>
            </ScrollArea>
            <div className="flex flex-col gap-2 p-2">
              <div className="flex-1 flex flex-col">
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
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />

                  <div className="flex items-center justify-end px-2 py-2">
                    <div className="flex gap-1">
                      <Button
                        intent="primary"
                        iconOnly
                        aria-label="发送"
                        title="发送"
                        disabled={
                          sending ||
                          !messageInput.trim() ||
                          (!selectedModel && models.length === 0)
                        }
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
