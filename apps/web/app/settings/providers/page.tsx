"use client";

import { PageHeader, IconStatusItem } from "@repo/ui";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
// Metadata retained only if future localization merges are needed
import { MessageSquare, User, Mic } from "lucide-react";
import useScrollToHash from "../../../src/hooks/useScrollToHash";
import {
  useProvidersStore,
  useProvidersHydrate,
} from "../../../src/store/providersStore";

export default function ProvidersPage() {
  const router = useRouter();
  useProvidersHydrate();

  const chat = useProvidersStore((s) => s.getProvidersByCategory("chat"));
  const speech = useProvidersStore((s) => s.getProvidersByCategory("speech"));
  const transcription = useProvidersStore((s) =>
    s.getProvidersByCategory("transcription")
  );
  useScrollToHash({
    auto: true,
    offset: 16,
    behavior: "smooth",
    maxRetries: 15,
    retryDelay: 150,
    queryParam: "section",
    clearQueryParam: true,
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          title="服务来源"
          subtitle="Providers"
          showBackButton
          onBack={() => router.back()}
        />

        {/* Intro banner */}
        <div className="mt-4 rounded-lg p-4 bg-primary-500/10 dark:bg-primary-800/25">
          <div className="mb-2 text-xl font-normal text-primary-800 dark:text-primary-100">
            第一次来这里？
          </div>
          <div className="text-primary-700 dark:text-primary-300">
            youngro 需要至少配置一个
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 translate-y-[0.25lh] bg-primary-500/10 dark:bg-primary-800/25 ml-1 mr-1">
              <MessageSquare className="h-4 w-4" />
              <strong className="font-normal">Chat</strong>
            </span>
            提供商来驱动智能对话与决策。
          </div>
        </div>

        {/* Chat providers */}
        <div id="chat" className="mt-6 flex flex-row items-center gap-2">
          <MessageSquare className="h-10 w-10 text-neutral-500 dark:text-neutral-400" />
          <div>
            <div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 sm:text-base">
                文本生成模型提供商，例如 OpenRouter、OpenAI、Ollama。
              </span>
            </div>
            <div className="flex text-2xl sm:text-3xl font-normal text-nowrap">
              <div>Chat</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {chat.map((ps) => {
            const Icon = ps.meta.icon;
            return (
              <IconStatusItem
                key={ps.meta.id}
                href={`/settings/providers/${ps.meta.category}/${ps.meta.id}`}
                title={ps.meta.localizedName || "Unknown"}
                description={ps.meta.localizedDescription}
                icon={Icon ? <Icon className="h-full w-full" /> : undefined}
                iconColorClassName={ps.meta.iconColorClassName}
                configured={ps.configured}
              />
            );
          })}
        </div>

        {/* Speech providers */}
        <div id="speech" className="my-5 flex flex-row items-center gap-2">
          <User className="h-10 w-10 text-neutral-500 dark:text-neutral-400" />
          <div>
            <div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 sm:text-base">
                语音合成（TTS）提供商，例如 ElevenLabs、Azure Speech。
              </span>
            </div>
            <div className="flex text-2xl sm:text-3xl font-normal text-nowrap">
              <div>Speech</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {speech.map((ps) => {
            const Icon = ps.meta.icon;
            return (
              <IconStatusItem
                key={ps.meta.id}
                href={`/settings/providers/${ps.meta.category}/${ps.meta.id}`}
                title={ps.meta.localizedName || "Unknown"}
                description={ps.meta.localizedDescription}
                icon={Icon ? <Icon className="h-full w-full" /> : undefined}
                iconColorClassName={ps.meta.iconColorClassName}
                configured={ps.configured}
              />
            );
          })}
        </div>

        {/* Transcription providers */}
        <div
          id="transcription"
          className="my-5 flex flex-row items-center gap-2"
        >
          <Mic className="h-10 w-10 text-neutral-500 dark:text-neutral-400" />
          <div>
            <div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 sm:text-base">
                语音转文字（STT）提供商，例如 Whisper.cpp、OpenAI。
              </span>
            </div>
            <div className="flex text-2xl sm:text-3xl font-normal text-nowrap">
              <div>Transcription</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {transcription.map((ps) => {
            const Icon = ps.meta.icon;
            return (
              <IconStatusItem
                key={ps.meta.id}
                href={`/settings/providers/${ps.meta.category}/${ps.meta.id}`}
                title={ps.meta.localizedName || "Unknown"}
                description={ps.meta.localizedDescription}
                icon={Icon ? <Icon className="h-full w-full" /> : undefined}
                iconColorClassName={ps.meta.iconColorClassName}
                configured={ps.configured}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
