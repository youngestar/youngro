"use client";

import { PageHeader, IconStatusItem } from "@repo/ui";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import {
  chatProviders,
  audioSpeechProviders,
  audioTranscriptionProviders,
} from "../../../src/data/settings/providers";
import type { ProviderMeta } from "../../../src/data/settings/providers";
import { MessageSquare, User, Mic } from "lucide-react";
import useScrollToHash from "../../../src/hooks/useScrollToHash";

export default function ProvidersPage() {
  const router = useRouter();
  useScrollToHash({
    auto: true,
    offset: 16,
    behavior: "smooth",
    maxRetries: 15,
    retryDelay: 150,
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
          {chatProviders.map((provider: ProviderMeta) => {
            const Icon = provider.icon;
            return (
              <IconStatusItem
                key={provider.id}
                href={`/settings/providers/${provider.category}/${provider.id}`}
                title={provider.localizedName || "Unknown"}
                description={provider.localizedDescription}
                icon={Icon ? <Icon className="h-full w-full" /> : undefined}
                iconColorClassName={provider.iconColorClassName}
                configured={provider.configured}
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
          {audioSpeechProviders.map((provider: ProviderMeta) => {
            const Icon = provider.icon;
            return (
              <IconStatusItem
                key={provider.id}
                href={`/settings/providers/${provider.category}/${provider.id}`}
                title={provider.localizedName || "Unknown"}
                description={provider.localizedDescription}
                icon={Icon ? <Icon className="h-full w-full" /> : undefined}
                iconColorClassName={provider.iconColorClassName}
                configured={provider.configured}
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
          {audioTranscriptionProviders.map((provider: ProviderMeta) => {
            const Icon = provider.icon;
            return (
              <IconStatusItem
                key={provider.id}
                href={`/settings/providers/${provider.category}/${provider.id}`}
                title={provider.localizedName || "Unknown"}
                description={provider.localizedDescription}
                icon={Icon ? <Icon className="h-full w-full" /> : undefined}
                iconColorClassName={provider.iconColorClassName}
                configured={provider.configured}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
