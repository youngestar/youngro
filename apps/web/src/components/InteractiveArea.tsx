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
import { Send, Volume2, VolumeX } from "lucide-react";
import {
  useProvidersStore,
  useProvidersHydrate,
} from "../store/providersStore";
import { useConsciousnessStore } from "../store/consciousnessStore";
import useStreamingSpeechPlayback from "../hooks/useStreamingSpeechPlayback";

export const InteractiveArea: React.FC = () => {
  const { send, sending, registerOnStreamEnd } = useChatStore();
  const [messageInput, setMessageInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useProvidersHydrate();
  const providers = useProvidersStore((s) => s.getProvidersByCategory("chat"));
  const fetchModels = useProvidersStore((s) => s.fetchModels);
  const { activeProviderId, activeModelId, customModelName } =
    useConsciousnessStore();

  const fallbackProviderId = useMemo(() => {
    if (activeProviderId) return activeProviderId;
    const configured = providers.find((p) => p.configured);
    return configured?.meta.id || "deepseek";
  }, [activeProviderId, providers]);

  const providerState = useProvidersStore((s) =>
    s.getProvider(fallbackProviderId)
  );
  const models = useMemo(
    () => providerState?.resources.items ?? [],
    [providerState?.resources.items]
  );
  const providerConfig = useMemo(() => {
    const cfg = providerState?.config;
    return cfg ? { ...cfg } : undefined;
  }, [providerState?.config]);
  const [fallbackModelId, setFallbackModelId] = useState<string>("");
  const {
    enabled: speechAutoplayEnabled,
    setEnabled: setSpeechAutoplayEnabled,
    status: speechPlaybackStatus,
    error: speechPlaybackError,
    ready: speechPlaybackReady,
    queueSize: speechQueueSize,
    lastEmotion: speechLastEmotion,
    stop: stopSpeechPlayback,
  } = useStreamingSpeechPlayback();

  const speechStatusText = useMemo(() => {
    switch (speechPlaybackStatus) {
      case "chunking":
        return "语音分段中…";
      case "buffering":
        return "语音合成中…";
      case "playing":
        return "播报中…";
      case "error":
        return "语音播放异常";
      default:
        return null;
    }
  }, [speechPlaybackStatus]);

  const selectedModel = useMemo(() => {
    if (customModelName?.trim()) return customModelName.trim();
    if (activeModelId) return activeModelId;
    return fallbackModelId || models[0]?.id || "";
  }, [activeModelId, customModelName, fallbackModelId, models]);

  const handleSend = useCallback(() => {
    if (isComposing || sending) return;
    const text = messageInput.trim();
    if (!text) return;
    const modelToUse = selectedModel || models[0]?.id || undefined;
    setMessageInput("");
    void send(text, {
      model: modelToUse,
      providerId: fallbackProviderId,
      providerConfig,
    });
    textareaRef.current?.focus();
  }, [
    isComposing,
    sending,
    messageInput,
    send,
    selectedModel,
    fallbackProviderId,
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
    if (fallbackProviderId) void fetchModels(fallbackProviderId);
  }, [fallbackProviderId, fetchModels]);

  useEffect(() => {
    if (!activeModelId && !customModelName && models.length) {
      const firstModel = models[0];
      if (firstModel) setFallbackModelId(firstModel.id);
    }
  }, [models, activeModelId, customModelName]);

  return (
    <div className="flex flex-col items-center pt-4 w-full h-full">
      <div className="w-full h-[85dvh] py-4">
        <div className="h-full mx-auto w-[600px] max-w-[95%] min-w-[30%] rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
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
                        type="button"
                        intent={speechAutoplayEnabled ? "primary" : "subtle"}
                        iconOnly
                        aria-pressed={speechAutoplayEnabled}
                        aria-label="自动播报回复"
                        title={
                          speechPlaybackReady
                            ? speechAutoplayEnabled
                              ? "自动播报已开启"
                              : "点击开启自动播报"
                            : "需先配置语音 Provider"
                        }
                        disabled={!speechPlaybackReady}
                        onClick={() =>
                          setSpeechAutoplayEnabled(!speechAutoplayEnabled)
                        }
                      >
                        <Icon
                          icon={speechAutoplayEnabled ? Volume2 : VolumeX}
                          size="sm"
                        />
                      </Button>
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
                {/* <div className="flex flex-col gap-1 px-2 pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-center gap-1">
                      <span>
                        自动播报：
                        {speechAutoplayEnabled ? "已开启" : "未开启"}
                        {!speechPlaybackReady ? "（需配置语音 Provider）" : ""}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      intent="subtle"
                      disabled={speechPlaybackStatus === "idle"}
                      onClick={() => stopSpeechPlayback()}
                    >
                      停止播报
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {speechStatusText && (
                      <span className="text-neutral-500">
                        {speechStatusText}
                      </span>
                    )}
                    {speechQueueSize > 0 && (
                      <span className="text-neutral-500">
                        队列剩余 {speechQueueSize} 段
                      </span>
                    )}
                    {speechLastEmotion && (
                      <span className="text-neutral-500">
                        当前情绪：{speechLastEmotion}
                      </span>
                    )}
                    {speechPlaybackError && (
                      <span className="text-red-500">
                        语音播放失败：{speechPlaybackError}
                      </span>
                    )}
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveArea;
