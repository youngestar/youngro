import * as React from "react";
import { Field, Input, Textarea } from "@repo/ui";

export type CardDetailsTab = "details" | "modules";

// 轻量类型：仅包含渲染所需字段，避免与 app 内 types 强耦合
export interface YoungroCardLite {
  name: string;
  version: string;
  nickname?: string;
  description?: string;
  notes?: string;
  systemPrompt?: string;
  personality?: string;
  scenario?: string;
  tags?: string[];
  extensions?: {
    youngro?: {
      modules?: {
        consciousness?: { model?: string };
        speech?: { model?: string; voice_id?: string };
        vrm?: { url?: string };
        live2d?: { url?: string };
      };
    };
  };
}

export function CardDetailsPanel({
  card,
  tab,
  onChangeTab,
}: {
  card: YoungroCardLite;
  tab: CardDetailsTab;
  onChangeTab?: (tab: CardDetailsTab) => void;
}) {
  const youngro = card.extensions?.youngro;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          className={`rounded px-3 py-1 text-sm ${
            tab === "details"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          }`}
          onClick={() => onChangeTab?.("details")}
          type="button"
        >
          详情
        </button>
        <button
          className={`rounded px-3 py-1 text-sm ${
            tab === "modules"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          }`}
          onClick={() => onChangeTab?.("modules")}
          type="button"
        >
          模块
        </button>
      </div>

      {tab === "details" ? (
        <div className="space-y-4">
          <Field label="名称">
            <Input value={card.name} readOnly tone="plain" />
          </Field>
          {card.nickname ? (
            <Field label="昵称">
              <Input value={card.nickname} readOnly tone="plain" />
            </Field>
          ) : null}
          <Field label="版本">
            <Input value={card.version} readOnly tone="plain" />
          </Field>
          {card.description ? (
            <Field label="描述">
              <Textarea
                value={card.description}
                readOnly
                rows={3}
                tone="plain"
              />
            </Field>
          ) : null}
          {card.notes ? (
            <Field label="创作者备注">
              <Textarea value={card.notes} readOnly rows={3} tone="plain" />
            </Field>
          ) : null}
          {card.systemPrompt ? (
            <Field label="系统提示">
              <Textarea
                value={card.systemPrompt}
                readOnly
                rows={6}
                tone="plain"
              />
            </Field>
          ) : null}
          {card.personality ? (
            <Field label="性格">
              <Textarea
                value={card.personality}
                readOnly
                rows={3}
                tone="plain"
              />
            </Field>
          ) : null}
          {card.scenario ? (
            <Field label="场景">
              <Textarea value={card.scenario} readOnly rows={3} tone="plain" />
            </Field>
          ) : null}
          {card.tags && card.tags.length ? (
            <Field label="标签">
              <div className="flex flex-wrap gap-2">
                {card.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Field>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="意识模型">
            <Input
              value={youngro?.modules?.consciousness?.model ?? "-"}
              readOnly
              tone="plain"
            />
          </Field>
          <Field label="语音模型">
            <Input
              value={youngro?.modules?.speech?.model ?? "-"}
              readOnly
              tone="plain"
            />
          </Field>
          <Field label="语音音色">
            <Input
              value={youngro?.modules?.speech?.voice_id ?? "-"}
              readOnly
              tone="plain"
            />
          </Field>
          {youngro?.modules?.vrm?.url ? (
            <Field label="VRM 模型 URL">
              <Input value={youngro.modules.vrm.url} readOnly tone="plain" />
            </Field>
          ) : null}
          {youngro?.modules?.live2d?.url ? (
            <Field label="Live2D 模型 URL">
              <Input value={youngro.modules.live2d.url} readOnly tone="plain" />
            </Field>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function formatCardSummary(card: {
  id: string;
  title: string;
  description?: string;
}) {
  const desc = card.description?.trim();
  return desc ? `${card.title} — ${desc}` : card.title;
}
