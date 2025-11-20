"use client";

import { Button, Field, Input } from "@repo/ui";
import ProviderPageHeader from "../../../../../src/components/ProviderPageHeader";
import {
  useProvidersStore,
  useProvidersHydrate,
  ChatProviderConfig,
  SpeechProviderConfig,
  TranscriptionProviderConfig,
} from "../../../../../src/store/providersStore";
import React, { useEffect, useMemo, useState } from "react";

const EMPTY_ERRORS: string[] = [];

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [lastValidatedAt, setLastValidatedAt] = useState<number | null>(null);

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
      if (providerState.configured) {
        setLastValidatedAt(Date.now());
        setTestStatus("success");
      }
    }
  }, [providerState]);

  const validateErrors = providerState?.validateErrors ?? EMPTY_ERRORS;

  const fieldErrors = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const err of validateErrors) {
      if (err.toLowerCase().includes("apikey") || err.includes("API Key")) {
        map.apiKey = err;
      } else if (err.toLowerCase().includes("base url")) {
        map.baseUrl = err;
      } else if (err.includes("Voice") || err.includes("voiceId")) {
        map.extra = err;
      } else if (err.includes("Model")) {
        map.extra = err;
      }
    }
    return map;
  }, [validateErrors]);

  if (!providerState || providerState.meta.category !== category) return null;
  const meta = providerState.meta;
  const Icon = meta.icon;

  const configured = providerState.configured;
  const validating = providerState.validating;
  const models = providerState.resources.items;
  const modelsStatus = providerState.resources.status;

  const extraLabel =
    meta.category === "speech"
      ? "Voice ID"
      : meta.category === "transcription"
        ? "Model ID"
        : "Default Model (可选)";

  function saveConfig() {
    setConfig(meta.id, {
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
      ...(meta.category === "speech"
        ? { voiceId: extraField || undefined }
        : meta.category === "transcription"
          ? { modelId: extraField || undefined }
          : { defaultModel: extraField || undefined }),
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2_000);
  }

  async function testConnection() {
    setTestStatus("testing");
    const ok = await validate(meta.id);
    if (ok) {
      setTestStatus("success");
      setLastValidatedAt(Date.now());
      await fetchModels(meta.id, true);
    } else {
      setTestStatus("error");
    }
  }

  function resetConfig() {
    setApiKey("");
    setBaseUrl("");
    setExtraField("");
    setConfig(meta.id, {});
    setSaveStatus("idle");
    setTestStatus("idle");
  }

  return (
    <div className="space-y-6 p-4">
      <ProviderPageHeader
        title={meta.localizedName}
        subtitle={category}
        icon={Icon ? <Icon className="h-6 w-6 opacity-80" /> : undefined}
      />

      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium">凭证配置</h2>
            <p className="text-xs text-neutral-500">
              输入 DeepSeek 的 API Key 与可选 Base URL，可使用代理地址（需以 /
              结尾）。
            </p>
          </div>
          <span
            className={`text-sm px-2 py-1 rounded-md border ${configured ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-neutral-500/10 text-neutral-500"}`}
          >
            {configured ? "已配置" : "未配置"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="API Key"
            help="从 DeepSeek 控制台复制的密钥，保留本地存储。"
            error={fieldErrors.apiKey}
          >
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              type="password"
              tone="plain"
              intent={fieldErrors.apiKey ? "destructive" : "default"}
            />
          </Field>
          <Field
            label="Base URL"
            help='可选，默认直连官方接口；自建代理需以 "/" 结尾。'
            error={fieldErrors.baseUrl}
          >
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com/v1/"
              tone="plain"
              intent={fieldErrors.baseUrl ? "destructive" : "default"}
            />
          </Field>
        </div>
        <div className="grid gap-4">
          <Field
            label={extraLabel}
            help={
              meta.category === "chat"
                ? "可设定默认模型，在聊天页自动选中"
                : "留空则使用平台默认配置"
            }
            error={fieldErrors.extra}
          >
            <Input
              value={extraField}
              onChange={(e) => setExtraField(e.target.value)}
              placeholder={extraLabel}
              tone="plain"
              intent={fieldErrors.extra ? "destructive" : "default"}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={saveConfig} intent="default" size="md">
            保存
          </Button>
          <Button
            type="button"
            onClick={testConnection}
            intent="primary"
            size="md"
            disabled={testStatus === "testing" || validating}
          >
            {testStatus === "testing" || validating
              ? "验证中..."
              : "验证并拉取模型"}
          </Button>
          <Button
            type="button"
            onClick={resetConfig}
            intent="default"
            size="md"
          >
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
        {validateErrors.length > 0 && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
            <p className="font-medium">校验未通过：</p>
            <ul className="list-disc pl-4">
              {validateErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">模型列表</h2>
            <p className="text-xs text-neutral-500">
              验证成功后将自动同步可用模型，可在聊天页选择。
            </p>
          </div>
          <Button
            type="button"
            onClick={() => fetchModels(meta.id, true)}
            intent="default"
            size="md"
          >
            重新加载
          </Button>
        </div>
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
      </section>
    </div>
  );
}
