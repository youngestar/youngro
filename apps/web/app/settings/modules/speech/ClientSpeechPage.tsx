"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button, Checkbox, Field, Input, RadioCard, ScrollArea, Textarea } from "@youngro/ui";
import {
  useProvidersHydrate,
  useProvidersStore,
  type SpeechProviderConfig,
} from "../../../../src/store/providersStore";
import { useSpeechStore } from "../../../../src/store/speechStore";
import { useSpeechResources } from "../../../../src/hooks/useSpeechResources";

function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

interface DemoVoice {
  id: string;
  name: string;
  description: string;
  locale: string;
  gender: string;
  tags?: string[];
  previewUrl?: string;
  compatibleModels?: string[];
}

const VOICE_CATALOG: Record<string, DemoVoice[]> = {
  default: [
    {
      id: "clarity",
      name: "Clarity",
      description: "温柔女声，适合通用播报",
      locale: "zh-CN",
      gender: "female",
      tags: ["流畅", "自然"],
    },
    {
      id: "mentor",
      name: "Mentor",
      description: "磁性男声，偏低沉",
      locale: "en-US",
      gender: "male",
      tags: ["低音", "叙述"],
    },
    {
      id: "sprout",
      name: "Sprout",
      description: "活泼语气，适合助手角色",
      locale: "ja-JP",
      gender: "female",
      tags: ["元气"],
    },
    {
      id: "orion",
      name: "Orion",
      description: "多语言合成，支持 20+ 语种",
      locale: "multi",
      gender: "male",
      tags: ["多语", "实验"],
    },
  ],
  "tencent-cloud-speech": [
    {
      id: "tencent_yunxiaobei",
      name: "云小贝",
      description: "腾讯云精品中文女声，情感饱满",
      locale: "zh-CN",
      gender: "female",
      tags: ["亲和", "客服"],
    },
    {
      id: "tencent_yunduo",
      name: "云朵",
      description: "中英双语可切换，适合多语播报",
      locale: "zh-CN",
      gender: "female",
      tags: ["双语"],
    },
    {
      id: "tencent_yunyi",
      name: "云逸",
      description: "沉稳男声，适合叙述和资讯场景",
      locale: "zh-CN",
      gender: "male",
      tags: ["资讯", "磁性"],
    },
  ],
};

const MODEL_FALLBACK = [
  {
    id: "neuro-tts-v2",
    name: "Neuro TTS v2",
    description: "多场景神经网络语音模型",
  },
  {
    id: "studio-lite",
    name: "Studio Lite",
    description: "快速响应，适合实时播报",
  },
  {
    id: "duo-bilingual",
    name: "Duo Bilingual",
    description: "中英双语，带 SSML 支持",
  },
];

const SAMPLE_TEXT = "你好，我是 Youngro 的语音助手。";

export function ClientSpeechPage() {
  useProvidersHydrate();
  const speechProviders = useProvidersStore((s) => s.getProvidersByCategory("speech"));
  const configuredSpeechProviders = useMemo(
    () => speechProviders.filter((provider) => provider.configured),
    [speechProviders]
  );
  const fetchProviderModels = useProvidersStore((s) => s.fetchModels);

  const [activeProviderId, setActiveProviderId] = useState<string>("");
  const [activeModelId, setActiveModelId] = useState<string>("");
  const [modelSearch, setModelSearch] = useState("");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [textInput, setTextInput] = useState(SAMPLE_TEXT);
  const [ssmlInput, setSsmlInput] = useState("<speak>你好</speak>");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAllModels, setShowAllModels] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const activeVoiceId = useSpeechStore((s) => s.activeVoiceId || "");
  const setActiveVoice = useSpeechStore((s) => s.setActiveVoice);
  const speechActiveProviderId = useSpeechStore((s) => s.activeProviderId);
  const speechActiveModelId = useSpeechStore((s) => s.activeModelId);
  const pitch = useSpeechStore((s) => s.pitch);
  const setPitch = useSpeechStore((s) => s.setPitch);
  const rate = useSpeechStore((s) => s.rate);
  const setRate = useSpeechStore((s) => s.setRate);
  const useSSML = useSpeechStore((s) => s.useSSML);
  const setUseSSML = useSpeechStore((s) => s.setUseSSML);
  const setSpeechActiveProvider = useSpeechStore((s) => s.setActiveProvider);
  const setSpeechActiveModel = useSpeechStore((s) => s.setActiveModel);

  const {
    provider: activeProvider,
    voices: providerVoices,
    voicesError,
    voiceStatus,
    fetchVoices: fetchSpeechVoices,
    fetchModels: fetchSpeechModels,
    modelsError,
    modelsStatus,
  } = useSpeechResources({ providerId: activeProviderId });

  const providerConfig = activeProvider?.config as SpeechProviderConfig | undefined;

  const effectiveModelsStatus = modelsStatus;

  useEffect(() => {
    if (!activeProviderId && speechActiveProviderId) {
      setActiveProviderId(speechActiveProviderId);
    }
    const next = activeProviderId || null;
    if (speechActiveProviderId !== next) {
      setSpeechActiveProvider(next);
    }
  }, [activeProviderId, speechActiveProviderId, setSpeechActiveProvider]);

  useEffect(() => {
    if (!activeModelId && speechActiveModelId) {
      setActiveModelId(speechActiveModelId);
    }
    const next = activeModelId || null;
    if (speechActiveModelId !== next) {
      setSpeechActiveModel(next);
    }
  }, [activeModelId, speechActiveModelId, setSpeechActiveModel]);

  useEffect(() => {
    if (!activeProviderId) return;
    if (!providerConfig?.apiKey) return;
    void fetchSpeechVoices(undefined, providerConfig);
  }, [activeProviderId, providerConfig, fetchSpeechVoices]);

  useEffect(() => {
    if (activeProviderId || speechActiveProviderId) return;
    if (configuredSpeechProviders.length === 0) return;
    const first = configuredSpeechProviders[0];
    if (!first) return;
    setActiveProviderId(first.meta.id);
    setActiveModelId("");
    setSpeechActiveProvider(first.meta.id);
    setSpeechActiveModel(null);
    fetchSpeechModels(true).catch(() => undefined);
  }, [
    activeProviderId,
    speechActiveProviderId,
    configuredSpeechProviders,
    fetchSpeechModels,
    setSpeechActiveProvider,
    setSpeechActiveModel,
  ]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const providerModels = useMemo(() => {
    const items = activeProvider?.resources.items ?? [];
    if (items.length > 0) return items;
    return MODEL_FALLBACK;
  }, [activeProvider]);

  useEffect(() => {
    if (!providerVoices) return;
    if (!activeVoiceId) return;
    const exists = providerVoices.some((voice) => voice.id === activeVoiceId);
    if (!exists) {
      setActiveVoice(null);
    }
  }, [providerVoices, activeVoiceId, setActiveVoice]);

  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return providerModels;
    const q = modelSearch.toLowerCase().trim();
    return providerModels.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [providerModels, modelSearch]);

  const displayModels = showAllModels ? filteredModels : filteredModels.slice(0, 9);

  const availableVoices = useMemo<DemoVoice[]>(() => {
    if (providerVoices?.length) {
      return providerVoices.map((voice) => ({
        id: voice.id,
        name: voice.name,
        description:
          voice.description ||
          voice.languages?.map((lang) => lang.title || lang.code).join(" / ") ||
          "无更多信息",
        locale: voice.languages?.[0]?.code || "-",
        gender: voice.gender || "-",
        tags: voice.languages?.map((lang) => lang.code),
        previewUrl: voice.previewUrl,
      }));
    }
    const fallback = VOICE_CATALOG[activeProviderId] || VOICE_CATALOG.default;
    return fallback ?? [];
  }, [providerVoices, activeProviderId]);

  const voiceLoadState = voiceStatus;
  const voiceLoadError = voicesError ?? null;
  const canFetchVoices = Boolean(
    activeProviderId && (activeProvider?.config as SpeechProviderConfig | undefined)?.apiKey
  );

  const filteredVoices = useMemo<DemoVoice[]>(() => {
    if (!voiceSearch.trim()) return availableVoices;
    const q = voiceSearch.toLowerCase().trim();
    return availableVoices.filter(
      (voice) =>
        voice.id.toLowerCase().includes(q) ||
        voice.name.toLowerCase().includes(q) ||
        voice.description.toLowerCase().includes(q)
    );
  }, [availableVoices, voiceSearch]);

  const hasSpeechProviders = configuredSpeechProviders.length > 0;
  const canOperateModels = Boolean(activeProvider);

  const handleRefreshModels = async () => {
    if (!activeProvider) return;
    setIsRefreshingModels(true);
    try {
      await fetchSpeechModels(true);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleRefreshVoices = async () => {
    if (!activeProviderId) return;
    if (!providerConfig?.apiKey) {
      setErrorMessage("当前 Provider 未配置 API Key，暂无法拉取声线");
      return;
    }
    await fetchSpeechVoices(true, providerConfig);
  };

  const handlePlaygroundSubmit = async () => {
    if (!activeProviderId || !activeModelId || !activeVoiceId) {
      setErrorMessage("请先选择 Provider、模型与声线");
      return;
    }

    if (!activeProvider) {
      setErrorMessage("当前 Provider 不可用，请重新选择");
      return;
    }

    if (!providerConfig || Object.keys(providerConfig).length === 0) {
      setErrorMessage("请先在 Provider 页面完成凭证配置");
      return;
    }

    const trimmedText = useSSML ? ssmlInput.trim() : textInput.trim();
    if (!trimmedText) {
      setErrorMessage(useSSML ? "请输入 SSML 内容" : "请输入要合成的文本");
      return;
    }

    const rawVoice = providerVoices?.find((voice) => voice.id === activeVoiceId);
    if (!rawVoice) {
      setErrorMessage("尚未从 Provider 拉取真实声线，无法生成试听");
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/speech/providers/${activeProviderId}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...providerConfig,
          text: trimmedText,
          ssmlEnabled: useSSML,
          voiceId: activeVoiceId,
          voiceMetadata: rawVoice.metadata,
          pitch,
          rate,
          modelId: activeModelId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        audio?: string;
        mimeType?: string;
        error?: string;
        detail?: string;
      } | null;

      if (!response.ok) {
        const remoteError = payload?.error || payload?.detail || response.statusText;
        throw new Error(remoteError || "生成试听失败");
      }

      if (!payload?.audio) {
        throw new Error("接口未返回音频数据");
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const blob = base64ToBlob(payload.audio, payload.mimeType || "audio/mpeg");
      const objectUrl = URL.createObjectURL(blob);
      setAudioUrl(objectUrl);
    } catch (error) {
      setAudioUrl(null);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopPreview = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl bg-neutral-50 p-4 dark:bg-black/30">
      <section className="flex flex-col gap-6 lg:flex-row">
        <div className="basis-full min-w-0 lg:basis-[45%] lg:max-w-[45%]">
          <div className="space-y-8 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                  Provider 选择
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  选择已配置的语音服务来源，后续配置将基于该 Provider
                </p>
              </div>

              {hasSpeechProviders ? (
                <ScrollArea className="max-w-full">
                  <div className="flex gap-4 p-1">
                    {configuredSpeechProviders.map((provider) => {
                      const isActive = provider.meta.id === activeProviderId;
                      return (
                        <div key={provider.meta.id} className="flex min-w-[16rem] flex-col gap-2">
                          <RadioCard
                            label={provider.meta.localizedName ?? provider.meta.id}
                            description={provider.meta.localizedDescription}
                            icon={provider.meta.icon}
                            checked={isActive}
                            onChange={() => {
                              setActiveProviderId(provider.meta.id);
                              setActiveModelId("");
                              fetchProviderModels(provider.meta.id, true);
                            }}
                          />
                        </div>
                      );
                    })}

                    <Link
                      href={{
                        pathname: "/settings/providers",
                        query: { section: "speech" },
                      }}
                      className="relative flex min-w-[12rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-100 bg-white p-4 text-sm text-neutral-500 transition-all hover:border-primary-500/40 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400"
                    >
                      <span className="text-base font-medium">管理 / 新增 Provider</span>
                      <span className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                        前往 Provider 设置
                      </span>
                    </Link>
                  </div>
                </ScrollArea>
              ) : (
                <Link
                  href={{
                    pathname: "/settings/providers",
                    query: { section: "speech" },
                  }}
                  className="flex items-center gap-3 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300"
                >
                  <div className="text-2xl">⚠️</div>
                  <div className="flex flex-col">
                    <span className="font-medium">尚未配置任何语音服务商</span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      点击前往 Provider 页面完成配置
                    </span>
                  </div>
                </Link>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                  模型选择
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  从 Provider 返回的可用的 TTS 模型列表里指定
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Field label="搜索模型" className="max-w-sm">
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="输入模型名称或 ID"
                    disabled={!canOperateModels}
                  />
                </Field>
                <Button
                  type="button"
                  intent="subtle"
                  size="sm"
                  onClick={handleRefreshModels}
                  disabled={!activeProvider || isRefreshingModels}
                >
                  {isRefreshingModels ? "刷新中…" : "重新拉取"}
                </Button>
              </div>

              {effectiveModelsStatus === "loading" && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                  正在同步模型列表…
                </div>
              )}

              {effectiveModelsStatus === "error" && modelsError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                  {modelsError}
                </p>
              )}

              {canOperateModels ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {displayModels.map((model) => (
                    <RadioCard
                      key={model.id}
                      variant="compact"
                      label={model.name}
                      description={model.description || model.id}
                      checked={activeModelId === model.id}
                      onChange={() => setActiveModelId(model.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
                  请选择左侧的 Provider 后再加载模型列表。
                </p>
              )}

              {filteredModels.length > 9 && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    intent="subtle"
                    size="sm"
                    onClick={() => setShowAllModels((prev) => !prev)}
                  >
                    {showAllModels ? "收起模型" : `展开全部 ${filteredModels.length} 个模型`}
                  </Button>
                </div>
              )}

              {!filteredModels.length && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  未找到匹配的模型，可以尝试清空搜索或稍后重新拉取。
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                  声线选择
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {providerVoices?.length
                    ? "已从当前 Provider 拉取声线，可直接切换试听"
                    : "当 Provider 配置完成后即可在此拉取真实声线，当前展示示例数据"}
                </p>
              </div>

              {activeProvider ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Field label="搜索声线" className="max-w-sm flex-1">
                      <Input
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                        placeholder="输入声线名称或特征"
                      />
                    </Field>
                    <Button
                      type="button"
                      intent="subtle"
                      size="sm"
                      disabled={!canFetchVoices || voiceLoadState === "loading"}
                      onClick={() => void handleRefreshVoices()}
                    >
                      {voiceLoadState === "loading" ? "拉取中..." : "重新拉取"}
                    </Button>
                  </div>

                  <ScrollArea className="h-[360px] pr-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredVoices.map((voice) => (
                        <div
                          key={voice.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setActiveVoice(voice.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setActiveVoice(voice.id);
                            }
                          }}
                          className={clsx(
                            "rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60",
                            activeVoiceId === voice.id
                              ? "border-primary-200 bg-primary-50 shadow-sm dark:border-primary-900/60 dark:bg-primary-900/10"
                              : "border-neutral-100 bg-neutral-50 hover:border-primary-200 dark:border-neutral-800 dark:bg-neutral-950/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                                {voice.name}
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {voice.description}
                              </p>
                            </div>
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              {voice.locale.toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="rounded-full border border-neutral-200 px-2 py-0.5 dark:border-neutral-700">
                              {voice.gender === "female"
                                ? "女声"
                                : voice.gender === "male"
                                  ? "男声"
                                  : "中性"}
                            </span>
                            {voice.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-neutral-200 px-2 py-0.5 dark:border-neutral-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>支持 {voice.locale.toUpperCase()}</span>
                            {voice.previewUrl && <span>含示例音频</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {voiceLoadState === "loading" && (
                    <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
                      正在拉取声线数据...
                    </p>
                  )}

                  {voiceLoadError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                      声线拉取失败：{voiceLoadError}
                    </p>
                  )}
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
                  请先在左侧选择或配置语音 Provider。
                </p>
              )}

              {!filteredVoices.length && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  未搜索到声线，后续将接入 Provider 返回的真实列表。
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300">
              <div className="mb-2 text-base font-medium text-neutral-700 dark:text-neutral-100">
                参数调节
              </div>
              <Field label={`音高 (${pitch}%)`}>
                <Input
                  type="range"
                  min={-100}
                  max={100}
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                />
              </Field>

              <Field label={`语速 (${rate.toFixed(1)}x)`}>
                <Input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </Field>

              <label className="mt-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Checkbox checked={useSSML} onChange={(e) => setUseSSML(e.target.checked)} />
                启用 SSML 模式
              </label>
            </div>
          </div>
        </div>

        <div className="basis-full min-w-0 lg:basis-[55%] lg:max-w-[55%]">
          <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-500/10 p-2 text-primary-500">🗣️</div>
              <div>
                <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                  播报测试
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  输入文本或粘贴 SSML，点击「生成试听」即可预览合成效果。
                </p>
              </div>
            </div>

            {!useSSML ? (
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                placeholder="输入需要朗读的文本"
              />
            ) : (
              <Textarea
                value={ssmlInput}
                onChange={(e) => setSsmlInput(e.target.value)}
                rows={8}
                placeholder="<speak>你好</speak>"
                className="font-mono"
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                intent="primary"
                onClick={handlePlaygroundSubmit}
                disabled={isGenerating}
              >
                {isGenerating ? "生成中…" : "生成试听"}
              </Button>
              {audioUrl && (
                <Button type="button" intent="subtle" onClick={handleStopPreview}>
                  停止
                </Button>
              )}
              <span className="text-xs text-neutral-400">
                Pitch {pitch}% · Rate {rate.toFixed(1)}x
              </span>
            </div>

            {audioUrl && <audio className="w-full" controls autoPlay src={audioUrl} />}

            {errorMessage && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
