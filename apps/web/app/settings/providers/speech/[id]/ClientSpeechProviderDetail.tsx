"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Checkbox,
  Field,
  Input,
  RadioCard,
  ScrollArea,
  Textarea,
} from "@repo/ui";
import ProviderPageHeader from "../../../../../src/components/ProviderPageHeader";
import {
  useProvidersHydrate,
  useProvidersStore,
  type SpeechProviderConfig,
  type ModelInfo,
} from "../../../../../src/store/providersStore";
import { useSpeechStore } from "../../../../../src/store/speechStore";
import { useSpeechResources } from "../../../../../src/hooks/useSpeechResources";

const VOICE_PRESETS: Record<
  string,
  Array<{ id: string; name: string; info: string }>
> = {
  elevenlabs: [
    { id: "clara", name: "Clara", info: "温柔女声 · 英语" },
    { id: "ava", name: "Ava", info: "清亮女声 · 多语言" },
    { id: "storm", name: "Storm", info: "磁性男声 · 叙事" },
  ],
  "azure-speech": [
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", info: "中文女声" },
    { id: "zh-CN-YunxiNeural", name: "云希", info: "中文男声" },
    { id: "en-US-JennyNeural", name: "Jenny", info: "英语女声" },
  ],
  "tencent-cloud-speech": [
    { id: "yunxiaobei", name: "云小贝", info: "中文精品女声" },
    { id: "yunduo", name: "云朵", info: "中英双语" },
    { id: "yunyi", name: "云逸", info: "沉稳男声" },
  ],
  default: [
    { id: "clarity", name: "Clarity", info: "多语言 · 中性" },
    { id: "mentor", name: "Mentor", info: "低沉男声" },
    { id: "sprout", name: "Sprout", info: "元气女声" },
  ],
};

const MODEL_FALLBACK: ModelInfo[] = [
  { id: "neuro-tts", name: "Neuro TTS", provider: "local" },
  { id: "studio-lite", name: "Studio Lite", provider: "local" },
  { id: "duo-bilingual", name: "Duo Bilingual", provider: "local" },
];

const DEFAULT_TENCENT_WEBSITE_TYPE = "default";

interface Props {
  id: string;
}

export default function ClientSpeechProviderDetail({ id }: Props) {
  useProvidersHydrate();
  const providerState = useProvidersStore((s) => s.getProvider(id));
  const setConfig = useProvidersStore((s) => s.setConfig);
  const validate = useProvidersStore((s) => s.validate);

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [secretId, setSecretId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [region, setRegion] = useState("");
  const [appId, setAppId] = useState<string | number | "">("");
  const [voiceTypeField, setVoiceTypeField] = useState<string | number | "">(
    ""
  );
  const [websiteType, setWebsiteType] = useState(DEFAULT_TENCENT_WEBSITE_TYPE);
  const [modelId, setModelId] = useState("");
  const [voiceQuery, setVoiceQuery] = useState("");
  const [textInput, setTextInput] = useState("你好，我是 Youngro 发声模块。");
  const [ssmlInput, setSsmlInput] = useState("<speak>你好</speak>");
  const pitch = useSpeechStore((s) => s.pitch);
  const setPitch = useSpeechStore((s) => s.setPitch);
  const speed = useSpeechStore((s) => s.rate);
  const setSpeed = useSpeechStore((s) => s.setRate);
  const useSSML = useSpeechStore((s) => s.useSSML);
  const setUseSSML = useSpeechStore((s) => s.setUseSSML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [lastValidatedAt, setLastValidatedAt] = useState<number | null>(null);

  const meta = providerState?.meta;
  const providerId = meta?.id;

  const setSpeechActiveProvider = useSpeechStore((s) => s.setActiveProvider);
  const speechStoreActiveProviderId = useSpeechStore((s) => s.activeProviderId);
  const activeVoiceId = useSpeechStore((s) => s.activeVoiceId || "");
  const setActiveVoiceId = useSpeechStore((s) => s.setActiveVoice);
  const clearVoiceSelection = useSpeechStore((s) => s.clearVoiceSelection);
  const {
    voices: providerVoices,
    voicesError,
    voiceStatus,
    fetchVoices,
    fetchModels: fetchSpeechModels,
  } = useSpeechResources({ providerId });
  const isTencentProvider = providerId === "tencent-cloud-speech";
  const hasVoiceCredentials = isTencentProvider
    ? Boolean(secretId.trim() && secretKey.trim())
    : Boolean(apiKey.trim());
  const voiceRequestConfig = useMemo<SpeechProviderConfig>(() => {
    const trimmedWebsiteType = websiteType.trim();
    const normalizedWebsiteType = isTencentProvider
      ? trimmedWebsiteType || DEFAULT_TENCENT_WEBSITE_TYPE
      : trimmedWebsiteType || undefined;

    return {
      apiKey: apiKey.trim() ? apiKey : undefined,
      baseUrl: baseUrl.trim() ? baseUrl : undefined,
      secretId: secretId.trim() ? secretId : undefined,
      secretKey: secretKey.trim() ? secretKey : undefined,
      region: region.trim() ? region : undefined,
      appId: appId === "" ? undefined : appId,
      voiceType: voiceTypeField === "" ? undefined : voiceTypeField,
      websiteType: normalizedWebsiteType,
    };
  }, [
    apiKey,
    baseUrl,
    secretId,
    secretKey,
    region,
    appId,
    voiceTypeField,
    websiteType,
    isTencentProvider,
  ]);

  const lastConfigSignatureRef = useRef<string | null>(null);
  const lastProviderIdRef = useRef<string | null>(null);
  const prevConfiguredRef = useRef<boolean>(false);

  useEffect(() => {
    if (!providerState) return;
    const config: SpeechProviderConfig = {
      ...(providerState.config as SpeechProviderConfig),
    };
    const normalizedWebsiteTypeValue =
      config.websiteType === undefined || config.websiteType === null
        ? DEFAULT_TENCENT_WEBSITE_TYPE
        : String(config.websiteType);

    const signature = JSON.stringify({
      apiKey: config.apiKey || "",
      baseUrl: config.baseUrl || "",
      secretId: config.secretId || "",
      secretKey: config.secretKey || "",
      region: config.region || "",
      appId: config.appId || "",
      voiceType: config.voiceType || "",
      websiteType: normalizedWebsiteTypeValue,
    });
    const providerChanged = providerState.meta.id !== lastProviderIdRef.current;

    if (providerChanged || signature !== lastConfigSignatureRef.current) {
      setApiKey(config.apiKey || "");
      setBaseUrl(config.baseUrl || "");
      setSecretId(config.secretId || "");
      setSecretKey(config.secretKey || "");
      setRegion(config.region || "");
      setAppId(config.appId ?? "");
      setVoiceTypeField(config.voiceType ?? "");
      setWebsiteType(normalizedWebsiteTypeValue);
      lastConfigSignatureRef.current = signature;
    }

    if (providerChanged) {
      setModelId("");
      lastProviderIdRef.current = providerState.meta.id;
    }
  }, [providerState]);

  useEffect(() => {
    if (!providerId) return;
    if (speechStoreActiveProviderId !== providerId) {
      setSpeechActiveProvider(providerId);
    }
  }, [providerId, speechStoreActiveProviderId, setSpeechActiveProvider]);

  useEffect(() => {
    if (!providerId || !hasVoiceCredentials) return;
    void fetchVoices(undefined, voiceRequestConfig);
  }, [providerId, hasVoiceCredentials, voiceRequestConfig, fetchVoices]);

  useEffect(() => {
    if (!providerId || !providerState) return;
    if (speechStoreActiveProviderId !== providerId) return;
    const config = providerState.config as SpeechProviderConfig;
    if (config.voiceId && !activeVoiceId) {
      setActiveVoiceId(config.voiceId);
    }
  }, [
    providerId,
    providerState,
    activeVoiceId,
    setActiveVoiceId,
    speechStoreActiveProviderId,
  ]);

  useEffect(() => {
    if (!providerState) return;
    const justConfigured =
      providerState.configured && !prevConfiguredRef.current;
    const justInvalidated =
      !providerState.configured && prevConfiguredRef.current;
    if (justConfigured) {
      setTestStatus("success");
      setLastValidatedAt(Date.now());
    }
    if (justInvalidated) {
      setTestStatus("idle");
    }
    prevConfiguredRef.current = providerState.configured;
  }, [providerState]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const fallbackVoices = useMemo(() => {
    const id = providerId || "default";
    return VOICE_PRESETS[id] || VOICE_PRESETS.default;
  }, [providerId]) as Array<{ id: string; name: string; info: string }>;

  const voices = useMemo<
    Array<{ id: string; name: string; info: string }>
  >(() => {
    if (providerVoices?.length) {
      return providerVoices.map((voice) => ({
        id: voice.id,
        name: voice.name,
        info:
          voice.description ||
          voice.languages?.map((lang) => lang.title || lang.code).join(" / ") ||
          "无更多信息",
      }));
    }
    return fallbackVoices;
  }, [providerVoices, fallbackVoices]);

  const filteredVoices = useMemo<
    Array<{ id: string; name: string; info: string }>
  >(() => {
    if (!voiceQuery.trim()) return voices;
    const q = voiceQuery.toLowerCase();
    return voices.filter(
      (voice) =>
        voice.id.toLowerCase().includes(q) ||
        voice.name.toLowerCase().includes(q) ||
        voice.info.toLowerCase().includes(q)
    );
  }, [voices, voiceQuery]);

  const storeModels = providerState?.resources.items;
  const providerModels = useMemo<ModelInfo[]>(() => {
    return storeModels && storeModels.length ? storeModels : MODEL_FALLBACK;
  }, [storeModels]);

  const formattedPitch = pitch > 0 ? `+${pitch}` : `${pitch}`;
  const voiceLoadState = voiceStatus;
  const voiceLoadError = voicesError ?? null;
  const canFetchVoices = Boolean(providerId && hasVoiceCredentials);

  const credentialStatus = providerState?.validating
    ? {
        label: "校验中...",
        className:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/60",
      }
    : providerState?.configured
      ? {
          label: "已配置",
          className:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60",
        }
      : {
          label: "未配置",
          className: "bg-neutral-500/10 text-neutral-500 border-neutral-200/60",
        };

  useEffect(() => {
    const firstModel = providerModels[0];
    if (!modelId && firstModel) {
      setModelId(firstModel.id);
    }
  }, [modelId, providerModels]);

  useEffect(() => {
    if (!providerId) return;
    void fetchSpeechModels();
  }, [providerId, fetchSpeechModels]);

  if (!providerState || !meta || meta.category !== "speech") {
    return null;
  }

  function syncConfigToStore() {
    const trimmedWebsiteType = websiteType.trim();
    const websiteTypeForStore = isTencentProvider
      ? trimmedWebsiteType || DEFAULT_TENCENT_WEBSITE_TYPE
      : trimmedWebsiteType || undefined;

    setConfig(meta!.id, {
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
      secretId: secretId || undefined,
      secretKey: secretKey || undefined,
      region: region || undefined,
      appId: appId || undefined,
      voiceType: voiceTypeField || undefined,
      voiceId: undefined,
      websiteType: websiteTypeForStore,
    });
  }

  function handleSave() {
    syncConfigToStore();
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }

  async function handleValidate() {
    syncConfigToStore();
    setTestStatus("testing");
    const ok = await validate(meta!.id);
    if (ok) {
      setTestStatus("success");
      setLastValidatedAt(Date.now());
      await fetchSpeechModels(true);
    } else {
      setTestStatus("error");
    }
  }

  function handleReset() {
    setApiKey("");
    setBaseUrl("");
    setSecretId("");
    setSecretKey("");
    setRegion("");
    setAppId("");
    setVoiceTypeField("");
    setWebsiteType(isTencentProvider ? DEFAULT_TENCENT_WEBSITE_TYPE : "");
    setModelId("");
    setSaveStatus("idle");
    setTestStatus("idle");
    clearVoiceSelection(providerId);
    setActiveVoiceId(null);
    setConfig(meta!.id, {
      apiKey: undefined,
      baseUrl: undefined,
      secretId: undefined,
      secretKey: undefined,
      region: undefined,
      appId: undefined,
      voiceType: undefined,
      voiceId: undefined,
      websiteType: isTencentProvider ? DEFAULT_TENCENT_WEBSITE_TYPE : undefined,
    });
  }

  async function handleRefreshVoices(force?: boolean) {
    if (!providerId) return;
    if (!hasVoiceCredentials) {
      setErrorMessage(
        isTencentProvider
          ? "请先填写 SecretId 和 SecretKey 以拉取腾讯云声线"
          : "请先填写 API Key 以拉取声线"
      );
      return;
    }
    setErrorMessage(null);
    await fetchVoices(force, voiceRequestConfig);
  }

  async function handleGeneratePreview() {
    if (!providerId) return;
    if (!hasVoiceCredentials) {
      setErrorMessage(
        isTencentProvider
          ? "请先填写 SecretId 和 SecretKey"
          : "请先填写 API Key"
      );
      return;
    }

    const plainText = textInput.trim();
    const ssmlText = ssmlInput.trim();
    if (!useSSML && !plainText) {
      setErrorMessage("请输入要合成的文本");
      return;
    }
    if (useSSML && !ssmlText) {
      setErrorMessage("请输入 SSML 内容");
      return;
    }
    if (!activeVoiceId || !modelId) {
      setErrorMessage("请先选择模型与声线");
      return;
    }

    const selectedVoiceMetadata = providerVoices?.find(
      (voice) => voice.id === activeVoiceId
    )?.metadata;

    const payload = {
      ...voiceRequestConfig,
      text: useSSML ? ssmlText : plainText,
      ssmlEnabled: useSSML,
      voiceId: activeVoiceId,
      modelId,
      voiceMetadata: selectedVoiceMetadata,
      pitch,
      rate: speed,
    };

    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/speech/providers/${providerId}/synthesize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        const message =
          errorPayload.error || `语音合成失败 (HTTP ${response.status})`;
        throw new Error(
          errorPayload.detail ? `${message}: ${errorPayload.detail}` : message
        );
      }

      const data = (await response.json()) as {
        audio?: string;
        mimeType?: string;
      };

      if (!data.audio) {
        throw new Error("未获得音频数据");
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const blob = base64ToBlob(data.audio, data.mimeType || "audio/mpeg");
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setErrorMessage(null);
    } catch (error) {
      setAudioUrl(null);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleStopPreview() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
  }

  function base64ToBlob(base64: string, mimeType: string) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  const Icon = meta.icon;

  return (
    <div className="flex flex-col p-6">
      <ProviderPageHeader
        title={meta.localizedName}
        subtitle="speech"
        icon={Icon ? <Icon className="h-6 w-6 opacity-80" /> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200/70 bg-white/70 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium">凭证配置</h2>
                <p className="text-sm text-neutral-500">
                  填写 {meta.localizedName} 的 API Key、Base URL 以及默认声线。
                </p>
              </div>
              <span
                className={`rounded-md border px-2 py-1 text-xs ${credentialStatus.className}`}
              >
                {credentialStatus.label}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {meta.id === "tencent-cloud-speech" ? (
                <>
                  <Field label="SecretId">
                    <Input
                      placeholder="腾讯云 SecretId"
                      value={secretId}
                      onChange={(e) => setSecretId(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                  <Field label="SecretKey">
                    <Input
                      type="password"
                      placeholder="腾讯云 SecretKey"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                  <Field label="Region">
                    <Input
                      placeholder="ap-shanghai"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                  <Field label="AppId (可选)">
                    <Input
                      placeholder="腾讯云 AppId"
                      value={String(appId)}
                      onChange={(e) => setAppId(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                  <Field
                    label="Website Type"
                    help="腾讯云要求声明站点类型，例如 default / international"
                  >
                    <Input
                      placeholder="default"
                      value={websiteType}
                      onChange={(e) => setWebsiteType(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="API Key">
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                  <Field label="Base URL" help='可选，代理地址需以 "/" 结尾'>
                    <Input
                      placeholder="https://service.example.com/"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      tone="plain"
                    />
                  </Field>
                </>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="默认声线 (Voice ID)">
                <Input
                  placeholder="voice-id"
                  value={activeVoiceId}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setActiveVoiceId(value ? value : null);
                  }}
                  tone="plain"
                />
              </Field>
              <Field label="默认模型 (可选)">
                <Input
                  placeholder="tts-model"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  tone="plain"
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={handleSave}>保存</Button>
              <Button
                intent="primary"
                disabled={testStatus === "testing" || providerState.validating}
                onClick={handleValidate}
              >
                {testStatus === "testing" || providerState.validating
                  ? "验证中..."
                  : "验证并拉取模型"}
              </Button>
              <Button intent="default" onClick={handleReset}>
                清空
              </Button>
              {saveStatus === "saved" && (
                <span className="text-xs text-primary-600 dark:text-primary-400">
                  已保存（本地）
                </span>
              )}
              {testStatus === "success" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  验证成功
                  {lastValidatedAt
                    ? ` · ${new Date(lastValidatedAt).toLocaleTimeString()}`
                    : ""}
                </span>
              )}
              {testStatus === "error" && (
                <span className="text-xs text-rose-500">
                  验证失败，请检查输入。
                </span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200/70 bg-white/70 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium">声线选择</h2>
              <p className="text-sm text-neutral-500">
                {providerVoices?.length
                  ? "已从 Provider 拉取真实声线列表。"
                  : "待 Provider 配置完成后将尝试拉取声线，当前展示示例数据。"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Field label="搜索声线" className="max-w-sm flex-1">
                <Input
                  placeholder="输入声线 ID 或名称"
                  value={voiceQuery}
                  onChange={(e) => setVoiceQuery(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                intent="subtle"
                size="sm"
                disabled={!canFetchVoices || voiceLoadState === "loading"}
                onClick={() => handleRefreshVoices(true)}
              >
                {voiceLoadState === "loading" ? "拉取中..." : "重新拉取"}
              </Button>
            </div>

            <ScrollArea className="mt-4 h-[320px] pr-2">
              <div className="grid gap-3 p-2">
                {filteredVoices.map((voice) => (
                  <RadioCard
                    key={voice.id}
                    label={voice.name}
                    description={voice.info}
                    checked={activeVoiceId === voice.id}
                    onChange={() => {
                      setActiveVoiceId(voice.id);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>

            {voiceLoadState === "loading" && (
              <p className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40">
                正在拉取声线数据...
              </p>
            )}

            {voiceLoadError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300">
                声线拉取失败：{voiceLoadError}
              </p>
            )}

            {filteredVoices.length === 0 && voiceLoadState !== "loading" && (
              <p className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40">
                未找到匹配声线，可稍后重新拉取或更换 Provider。
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200/70 bg-white/70 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium">试听与调节</h2>
              <p className="text-sm text-neutral-500">
                接入后可在此输入文本/SSML 并试听效果。
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Field label="文本输入">
                <Textarea
                  minRows={3}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="输入待合成文本"
                />
              </Field>
              <Field
                label="SSML 输入"
                help="勾选后启用 SSML，未勾选时忽略此内容"
              >
                <Textarea
                  minRows={3}
                  value={ssmlInput}
                  onChange={(e) => setSsmlInput(e.target.value)}
                  placeholder="<speak>你好</speak>"
                  disabled={!useSSML}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Checkbox
                  checked={useSSML}
                  onChange={(event) => setUseSSML(event.target.checked)}
                />
                <span>启用 SSML</span>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={`语速 ${speed.toFixed(2)}x`}>
                  <Input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                  />
                </Field>
                <Field label={`音调 ${formattedPitch}`}>
                  <Input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  intent="primary"
                  disabled={isGenerating}
                  onClick={handleGeneratePreview}
                >
                  {isGenerating ? "生成中..." : "生成试听"}
                </Button>
                <Button
                  intent="default"
                  disabled={!audioUrl}
                  onClick={handleStopPreview}
                >
                  停止播放
                </Button>
                {errorMessage && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {errorMessage}
                  </span>
                )}
              </div>

              {audioUrl && (
                <audio
                  controls
                  src={audioUrl ?? undefined}
                  className="mt-2 w-full"
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
