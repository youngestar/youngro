"use client";

/**
 * 交互区（聊天主容器）
 * - 上方显示消息历史，下方提供输入与发送。
 */

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useChatStore } from "@youngro/feature-chat";
import { ChatHistory } from "./ChatHistory";
import { Textarea, Button, Icon } from "@youngro/ui";
import styles from "./InteractiveArea.module.css";
import { Send, Volume2, VolumeX } from "lucide-react";
import { useProvidersStore, useProvidersHydrate } from "../../../src/store/providersStore";
import { useConsciousnessStore } from "../../../src/store/consciousnessStore";
import useStreamingSpeechPlayback from "../../../src/hooks/useStreamingSpeechPlayback";

export const InteractiveArea: React.FC = () => {
  // 聊天核心状态与方法
  const { send, sending, registerOnStreamEnd } = useChatStore();
  // 输入框状态与中文输入法（IME）防冲突标志
  const [messageInput, setMessageInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 加载并获取大语言模型提供商 (Provider) 状态
  useProvidersHydrate();
  const providers = useProvidersStore((s) => s.getProvidersByCategory("chat"));
  const fetchModels = useProvidersStore((s) => s.fetchModels);

  // 获取当前用户配置的"意识"偏好 (选择的提供商与模型)
  const { activeProviderId, activeModelId, customModelName } = useConsciousnessStore();

  // 确定实际使用的 Provider ID（优先级：用户活动选择 > 首个已配置的 > 默认深海/deepseek）
  const fallbackProviderId = useMemo(() => {
    if (activeProviderId) return activeProviderId;
    const configured = providers.find((p) => p.configured);
    return configured?.meta.id || "deepseek";
  }, [activeProviderId, providers]);

  // 从全局 store 获取选中 Provider 的配置和支持的模型列表
  const providerState = useProvidersStore((s) => s.getProvider(fallbackProviderId));
  const models = useMemo(
    () => providerState?.resources.items ?? [],
    [providerState?.resources.items]
  );
  const providerConfig = useMemo(() => {
    const cfg = providerState?.config;
    return cfg ? { ...cfg } : undefined;
  }, [providerState?.config]);

  const [fallbackModelId, setFallbackModelId] = useState<string>("");

  // 流式语音（TTS）播报 Hook 及其状态
  const {
    enabled: speechAutoplayEnabled,
    setEnabled: setSpeechAutoplayEnabled,
    ready: speechPlaybackReady,
  } = useStreamingSpeechPlayback();

  // 确定最终使用的聊天大模型 ID
  const selectedModel = useMemo(() => {
    if (customModelName?.trim()) return customModelName.trim();
    if (activeModelId) return activeModelId;
    return fallbackModelId || models[0]?.id || "";
  }, [activeModelId, customModelName, fallbackModelId, models]);

  // 发送消息处理逻辑
  const handleSend = useCallback(() => {
    // 阻止发送：正在使用输入法 (中文拼音未确认) 或 消息正在回复中
    if (sending) return;
    const text = messageInput.trim();
    if (!text) return; // 空消息直接返回

    const modelToUse = selectedModel || models[0]?.id || undefined;
    setMessageInput(""); // 发送前清空输入框

    // 触发底层的 send action
    void send(text, {
      model: modelToUse,
      providerId: fallbackProviderId,
      providerConfig,
    });

    // 发送完尝试将光标重新对焦到输入框
    textareaRef.current?.focus();
  }, [sending, messageInput, send, selectedModel, fallbackProviderId, models, providerConfig]);

  // 监听大模型返回流结束事件，自动给输入框重新获取焦点
  useEffect(() => {
    const unsub = registerOnStreamEnd?.(() => {
      queueMicrotask(() => textareaRef.current?.focus());
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [registerOnStreamEnd]);

  // 当 Provider 有变化时，主动触发请求拉取该提供商的全部可用模型列表
  useEffect(() => {
    if (fallbackProviderId) void fetchModels(fallbackProviderId);
  }, [fallbackProviderId, fetchModels]);

  // 若没有指定活动模型/自定义模型名称，自动fallback选中返回的模型列表中的第一项
  useEffect(() => {
    if (!activeModelId && !customModelName && models.length) {
      const firstModel = models[0];
      if (firstModel) setFallbackModelId(firstModel.id);
    }
  }, [models, activeModelId, customModelName]);

  return (
    <div className="flex h-full w-full min-h-0 flex-col items-center pt-4">
      <div className="h-[85dvh] min-h-0 w-full py-4">
        <div className="h-full mx-auto w-[600px] max-w-[95%] min-w-[30%] rounded-xl border-4 border-primary-200/20 dark:border-primary-400/20 bg-primary-50/50 dark:bg-primary-950/70 backdrop-blur-md">
          <div className="flex h-full min-h-0 w-full flex-col">
            <div className="flex-1 min-h-0 px-2 py-2">
              <ChatHistory />
            </div>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleSend();
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
                        onClick={() => setSpeechAutoplayEnabled(!speechAutoplayEnabled)}
                      >
                        <Icon icon={speechAutoplayEnabled ? Volume2 : VolumeX} size="sm" />
                      </Button>
                      <Button
                        intent="primary"
                        iconOnly
                        aria-label="发送"
                        title="发送"
                        disabled={
                          sending || !messageInput.trim() || (!selectedModel && models.length === 0)
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
