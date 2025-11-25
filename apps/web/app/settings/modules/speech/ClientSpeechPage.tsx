"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Button,
  Checkbox,
  Field,
  Input,
  RadioCard,
  ScrollArea,
  Textarea,
} from "@repo/ui";
import {
  useProvidersHydrate,
  useProvidersStore,
  type ProviderState,
  type SpeechProviderConfig,
} from "../../../../src/store/providersStore";

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
  const speechProviders = useProvidersStore((s) =>
    s.getProvidersByCategory("speech")
  );
  const fetchModels = useProvidersStore((s) => s.fetchModels);

  const [activeProviderId, setActiveProviderId] = useState<string>("");
  const [activeModelId, setActiveModelId] = useState<string>("");
  const [activeVoiceId, setActiveVoiceId] = useState<string>("");
  const [modelSearch, setModelSearch] = useState("");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [pitch, setPitch] = useState(0);
  const [rate, setRate] = useState(1);
  const [useSSML, setUseSSML] = useState(false);
  const [textInput, setTextInput] = useState(SAMPLE_TEXT);
  const [ssmlInput, setSsmlInput] = useState("<speak>你好</speak>");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAllModels, setShowAllModels] = useState(false);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  const activeProvider = useMemo<ProviderState | undefined>(
    () => speechProviders.find((p) => p.meta.id === activeProviderId),
    [speechProviders, activeProviderId]
  );

  const modelsStatus = activeProvider?.resources.status ?? "idle";
  const modelsError = activeProvider?.resources.error ?? null;

  useEffect(() => {
    if (!activeProviderId && speechProviders.length > 0) {
      const first = speechProviders[0];
      if (!first) return;
      setActiveProviderId(first.meta.id);
      setActiveModelId("");
      const speechConfig = first.config as SpeechProviderConfig;
      setActiveVoiceId(speechConfig?.voiceId || "");
      fetchModels(first.meta.id).catch(() => undefined);
    }
  }, [activeProviderId, speechProviders, fetchModels]);

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

  const displayModels = showAllModels
    ? filteredModels
    : filteredModels.slice(0, 9);

  const availableVoices = useMemo<DemoVoice[]>(() => {
    const fromCatalog =
      VOICE_CATALOG[activeProviderId] || VOICE_CATALOG.default;
    return fromCatalog ?? [];
  }, [activeProviderId]);

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

  const displayedVoices =
    (showAllVoices ? filteredVoices : filteredVoices.slice(0, 6)) ?? [];

  const hasSpeechProviders = speechProviders.length > 0;
  const canOperateModels = Boolean(activeProvider);

  const handleRefreshModels = async () => {
    if (!activeProvider) return;
    setIsRefreshingModels(true);
    try {
      await fetchModels(activeProvider.meta.id, true);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handlePlaygroundSubmit = async () => {
    if (!activeProviderId || !activeModelId || !activeVoiceId) {
      setErrorMessage("请先选择 Provider、模型与声线");
      return;
    }

    if (!useSSML && !textInput.trim()) {
      setErrorMessage("请输入要合成的文本");
      return;
    }

    if (useSSML && !ssmlInput.trim()) {
      setErrorMessage("请输入 SSML 内容");
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsGenerating(false);
    setAudioUrl(null);
    setErrorMessage("语音服务接入开发中，当前为 UI 骨架预览");
  };

  const handleStopPreview = () => {
    setAudioUrl(null);
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl bg-neutral-50 p-4 dark:bg-black/30">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                Provider 选择
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                选择已配置的语音服务来源，后续配置将基于该 Provider。
              </p>
            </div>

            {hasSpeechProviders ? (
              <ScrollArea className="max-w-full">
                <div className="flex gap-4 p-1">
                  {speechProviders.map((provider) => {
                    const isActive = provider.meta.id === activeProviderId;
                    return (
                      <RadioCard
                        key={provider.meta.id}
                        label={provider.meta.localizedName ?? provider.meta.id}
                        description={provider.meta.localizedDescription}
                        checked={isActive}
                        onChange={() => {
                          setActiveProviderId(provider.meta.id);
                          setActiveModelId("");
                          const speechConfig =
                            provider.config as SpeechProviderConfig;
                          setActiveVoiceId(speechConfig?.voiceId || "");
                          fetchModels(provider.meta.id, true);
                        }}
                        className="min-w-[15rem]"
                      />
                    );
                  })}

                  <Link
                    href="/settings/providers"
                    className="relative flex min-w-[12rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-white p-4 text-sm text-neutral-500 transition-all hover:border-primary-500/40 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400"
                  >
                    <span className="text-base font-medium">管理 Provider</span>
                    <span className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      跳转到 Provider 设置
                    </span>
                  </Link>
                </div>
              </ScrollArea>
            ) : (
              <Link
                href="/settings/providers"
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

          <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                模型选择
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                大多数 Provider 会返回可用的 TTS 模型列表，也可以手动指定。
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

            {modelsStatus === "loading" && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                正在同步模型列表…
              </div>
            )}

            {modelsStatus === "error" && modelsError && (
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
                  {showAllModels
                    ? "收起模型"
                    : `展开全部 ${filteredModels.length} 个模型`}
                </Button>
              </div>
            )}

            {!filteredModels.length && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                未找到匹配的模型，可以尝试清空搜索或稍后重新拉取。
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                声线选择
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                暂以静态示例演示交互，后续会接入真实声线列表与试听。
              </p>
            </div>

            <Field label="搜索声线" className="max-w-sm">
              <Input
                value={voiceSearch}
                onChange={(e) => setVoiceSearch(e.target.value)}
                placeholder="输入声线名称或特征"
                disabled={!canOperateModels}
              />
            </Field>

            {canOperateModels ? (
              <div className="grid gap-3 md:grid-cols-2">
                {displayedVoices.map((voice) => (
                  <div
                    key={voice.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveVoiceId(voice.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveVoiceId(voice.id);
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
                        {voice.gender === "female" ? "女声" : "男声"}
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
                    <div className="mt-3 flex items-center gap-2">
                      <Button type="button" size="sm" intent="subtle">
                        试听
                      </Button>
                      {voice.compatibleModels &&
                        voice.compatibleModels.length > 0 && (
                          <span className="text-xs text-primary-500">
                            限定 {voice.compatibleModels.length} 个模型
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400">
                请选择 Provider 以载入声线列表。
              </p>
            )}

            {filteredVoices.length > 6 && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  intent="subtle"
                  size="sm"
                  onClick={() => setShowAllVoices((prev) => !prev)}
                >
                  {showAllVoices
                    ? "收起声线"
                    : `展开全部 ${filteredVoices.length} 个声线`}
                </Button>
              </div>
            )}

            {!filteredVoices.length && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                未搜索到声线，后续将接入 Provider 返回的真实列表。
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                参数调节
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                仅提供 UI 占位，后续会映射到真实的 pitch / rate / SSML 等参数。
              </p>
            </div>

            <Field label={`音高 (${pitch}%)`}>
              <input
                type="range"
                min={-100}
                max={100}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full accent-primary-500"
              />
            </Field>

            <Field label={`语速 (${rate.toFixed(1)}x}`}>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-primary-500"
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <Checkbox
                checked={useSSML}
                onChange={(e) => setUseSSML(e.target.checked)}
              />
              启用 SSML 模式
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary-500/10 p-2 text-primary-500">
                  🗣️
                </div>
                <h3 className="text-base font-medium text-neutral-700 dark:text-neutral-100">
                  播报测试
                </h3>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                输入文本或粘贴 SSML，点击「生成试听」即可预览合成效果。
              </p>
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
                <Button
                  type="button"
                  intent="subtle"
                  onClick={handleStopPreview}
                >
                  停止
                </Button>
              )}
              <span className="text-xs text-neutral-400">
                Pitch {pitch}% · Rate {rate.toFixed(1)}x
              </span>
            </div>

            {audioUrl && (
              <audio className="w-full" controls autoPlay src={audioUrl} />
            )}

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
