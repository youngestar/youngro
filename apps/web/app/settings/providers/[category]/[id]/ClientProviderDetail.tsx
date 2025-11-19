"use client";

import ProviderPageHeader from "../../../../../src/components/ProviderPageHeader";
import {
  useProvidersStore,
  useProvidersHydrate,
  ChatProviderConfig,
  SpeechProviderConfig,
  TranscriptionProviderConfig,
} from "../../../../../src/store/providersStore";
import React, { useEffect, useState } from "react";

export default function ClientProviderDetail({
  category,
  id,
}: {
  category: string;
  id: string;
}) {
  useProvidersHydrate();
  const providerState = useProvidersStore((s) => s.getProvider(id));
  const setConfig = useProvidersStore((s) => s.setConfig);
  const validate = useProvidersStore((s) => s.validate);
  const fetchModels = useProvidersStore((s) => s.fetchModels);

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [extraField, setExtraField] = useState(""); // voiceId / modelId dynamic placeholder

  useEffect(() => {
    if (providerState) {
      const c = providerState.config as
        | ChatProviderConfig
        | SpeechProviderConfig
        | TranscriptionProviderConfig;
      setApiKey(c.apiKey || "");
      setBaseUrl(
        (c as ChatProviderConfig).baseUrl ||
          (c as SpeechProviderConfig).baseUrl ||
          (c as TranscriptionProviderConfig).baseUrl ||
          ""
      );
      setExtraField(
        (c as SpeechProviderConfig).voiceId ||
          (c as TranscriptionProviderConfig).modelId ||
          (c as ChatProviderConfig).defaultModel ||
          ""
      );
    }
  }, [providerState]);

  if (!providerState || providerState.meta.category !== category) return null;
  const meta = providerState.meta;
  const Icon = meta.icon;

  const configured = providerState.configured;
  const validating = providerState.validating;
  const validateErrors = providerState.validateErrors;
  const models = providerState.resources.items;
  const modelsStatus = providerState.resources.status;

  const extraLabel =
    meta.category === "speech"
      ? "Voice ID"
      : meta.category === "transcription"
        ? "Model ID"
        : "Default Model (可选)";

  async function onSave() {
    setConfig(meta.id, {
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
      ...(meta.category === "speech"
        ? { voiceId: extraField || undefined }
        : meta.category === "transcription"
          ? { modelId: extraField || undefined }
          : { defaultModel: extraField || undefined }),
    });
    await validate(meta.id);
    await fetchModels(meta.id, true);
  }

  return (
    <div className="space-y-6 p-4">
      <ProviderPageHeader
        title={meta.localizedName}
        subtitle={category}
        icon={Icon ? <Icon className="h-6 w-6 opacity-80" /> : undefined}
      />

      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">配置</h2>
          <span
            className={`text-sm px-2 py-1 rounded-md border ${configured ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-neutral-500/10 text-neutral-500"}`}
          >
            {configured ? "已配置" : "未配置"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>API Key</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="rounded-md border px-2 py-1 bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Base URL</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1/"
              className="rounded-md border px-2 py-1 bg-background"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span>{extraLabel}</span>
            <input
              value={extraField}
              onChange={(e) => setExtraField(e.target.value)}
              placeholder={extraLabel}
              className="rounded-md border px-2 py-1 bg-background"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={validating}
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
          >
            {validating ? "验证中..." : "保存并验证"}
          </button>
          {validateErrors.length > 0 && (
            <ul className="text-xs text-rose-500 space-y-0.5">
              {validateErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {validateErrors.length === 0 && configured && !validating && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              验证通过
            </span>
          )}
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="text-lg font-medium">模型列表 (占位)</h2>
        {modelsStatus === "loading" && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            加载中...
          </p>
        )}
        {modelsStatus === "error" && (
          <p className="text-sm text-rose-500">加载失败，可重试。</p>
        )}
        {modelsStatus === "success" && models.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            暂无数据。
          </p>
        )}
        {modelsStatus === "success" && models.length > 0 && (
          <ul className="text-sm list-disc pl-5 space-y-1">
            {models.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => fetchModels(meta.id, true)}
          className="inline-flex items-center rounded-md border px-3 py-1 text-sm bg-neutral-500/10 hover:bg-neutral-500/20 transition-colors"
        >
          重新加载
        </button>
      </section>
    </div>
  );
}
