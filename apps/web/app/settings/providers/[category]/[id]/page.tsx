import { notFound } from "next/navigation";
import {
  chatProviders,
  audioSpeechProviders,
  audioTranscriptionProviders,
  type ProviderMeta,
} from "../../../../../src/data/settings/providers";

function findMeta(category: string, id: string): ProviderMeta | undefined {
  const map = {
    chat: chatProviders,
    speech: audioSpeechProviders,
    transcription: audioTranscriptionProviders,
  } as const;
  return map[category as keyof typeof map]?.find((p) => p.id === id);
}

export default function ProviderDetail({
  params,
}: {
  params: { category: string; id: string };
}) {
  const meta = findMeta(params.category, params.id);
  if (!meta) return notFound();

  const Icon = meta.icon;

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          {Icon ? <Icon className="h-8 w-8 opacity-70" /> : null}
          {meta.localizedName}
          <span className="text-sm opacity-60">({params.category})</span>
        </h1>
        {meta.localizedDescription ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            {meta.localizedDescription}
          </p>
        ) : null}
      </header>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="text-lg font-medium">配置</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          这里将放置 {meta.localizedName} 的配置表单与模型列表（占位）。
        </p>
      </section>
    </div>
  );
}
