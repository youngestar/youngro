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
  const providerName = meta.localizedName || meta.id;
  const statusBadge = validating
    ? {
        label: "校验中...",
        className:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/60",
      }
    : configured
      ? {
          label: "已配置",
          className:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60",
        }
      : {
          label: "未配置",
          className: "bg-neutral-500/10 text-neutral-500 border-neutral-200/60",
        };
  const baseUrlPlaceholder =
    meta.category === "chat"
      ? "https://api.example.com/v1/"
      : "https://service.example.com/";

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
    export { default } from "../../components/ClientProviderDetail";
    setTimeout(() => setSaveStatus("idle"), 2_000);
