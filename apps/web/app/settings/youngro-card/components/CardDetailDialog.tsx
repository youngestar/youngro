"use client";

import React from "react";
import { SimpleModal } from "./SimpleModal";
import type { YoungroCard, YoungroExtension } from "@youngro/store-card";
import {
  FileText,
  StickyNote,
  UserRound,
  Settings as SettingsIcon,
  Ghost,
  Mic,
  Music,
} from "lucide-react";

export function CardDetailDialog({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card: YoungroCard | null;
  onClose: () => void;
  onActivate?: () => void;
  onDelete?: () => void;
}) {
  type TabId = "description" | "notes" | "character" | "modules";
  const [tab, setTab] = React.useState<TabId>("description");

  // 根据卡片内容动态决定可用 Tab
  const availableTabs = React.useMemo(() => {
    if (!card)
      return [] as { id: TabId; label: string; icon: React.ElementType }[];
    const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [];
    if (card.description && card.description.trim().length > 0)
      tabs.push({ id: "description", label: "描述", icon: FileText });
    if (card.notes && card.notes.trim().length > 0)
      tabs.push({ id: "notes", label: "创作者设定", icon: StickyNote });
    const hasCharacter = [
      card.personality,
      card.scenario,
      card.systemPrompt as string | undefined,
      card.postHistoryInstructions as string | undefined,
    ].some((v) => typeof v === "string" && v.trim().length > 0);
    if (hasCharacter)
      tabs.push({ id: "character", label: "角色设定", icon: UserRound });
    tabs.push({ id: "modules", label: "模块", icon: SettingsIcon });
    return tabs;
  }, [card]);

  // 若当前 tab 不在可用列表中，则切到第一个可用 tab；否则保留用户上次选择
  React.useEffect(() => {
    if (!availableTabs.length) return;
    const ids = availableTabs.map((t) => t.id);
    if (!ids.includes(tab)) setTab(ids[0] as TabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabs.length, card]);

  if (!card) return null;

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title={`${card.name} · v${card.version}`}
      // 放宽尺寸，提供更舒展的阅读空间（对齐 AIRI 的宽度策略）
      widthClassName="max-w-6xl w-[92vw] md:w-[85vw] xl:w-[70vw] 2xl:w-[60vw]"
    >
      {/* 顶部 Tabs */}
      <div className="mb-3">
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <div className="-mb-px flex justify-center space-x-1 sm:justify-start">
            {availableTabs.map((t) => {
              const Icon = t.icon as React.ElementType;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium ${
                    active
                      ? "border-b-2 border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                  }`}
                  role="tab"
                  aria-selected={active}
                >
                  <div className="flex items-center gap-1">
                    <Icon size={14} />
                    {t.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex flex-col gap-4">
        {tab === "notes" && card.notes && <RichBox text={card.notes} />}

        {tab === "description" && card.description && (
          <RichBox text={card.description} />
        )}

        {tab === "character" && (
          <div className="flex max-h-80 flex-col gap-4 overflow-auto pr-1">
            {(
              [
                ["性格 (Personality)", card.personality],
                ["场景 (Scenario)", card.scenario],
                [
                  "系统提示 (System Prompt)",
                  card.systemPrompt as string | undefined,
                ],
                [
                  "历史后提示 (Post History Instructions)",
                  card.postHistoryInstructions as string | undefined,
                ],
              ] as const
            ).map(([label, value]) =>
              typeof value === "string" && value.trim() ? (
                <div key={label} className="flex flex-col gap-2">
                  <h2 className="text-lg font-medium text-neutral-500 dark:text-neutral-400">
                    {label}
                  </h2>
                  <RichBox text={value} />
                </div>
              ) : null
            )}
          </div>
        )}

        {tab === "modules" && <ModulesBox card={card} />}
      </div>
    </SimpleModal>
  );
}

function highlightBracesToReactNodes(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\{\{.*?\}\})/g);
  return parts.map((part, idx) => {
    const m = part.match(/^\{\{(.*)\}\}$/);
    if (m) {
      const inner = (m?.[1] ?? "").trim();
      return (
        <span
          key={idx}
          className="inline-block bg-primary-500/20 px-1 py-0.5 text-primary-700 dark:text-primary-300"
        >
          {`{{ ${inner} }}`}
        </span>
      );
    }
    // 普通文本：保持换行
    return (
      <span key={idx} className="whitespace-pre-line">
        {part}
      </span>
    );
  });
}

function RichBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-neutral-200/50 bg-white/60 p-4 text-neutral-700 transition-all duration-200 hover:bg-white/80 dark:border-neutral-700/30 dark:bg-black/30 dark:text-neutral-300 dark:hover:bg-black/40">
      {highlightBracesToReactNodes(text)}
    </div>
  );
}

function ModulesBox({ card }: { card: YoungroCard }) {
  const youngro = (
    card.extensions as { youngro?: YoungroExtension } | undefined
  )?.youngro;
  const consciousness = youngro?.modules?.consciousness?.model ?? "default";
  const speechModel = youngro?.modules?.speech?.model ?? "default";
  const voice = youngro?.modules?.speech?.voice_id ?? "default";
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        {
          label: "意识模型 (Consciousness)",
          Icon: Ghost,
          value: consciousness,
        },
        { label: "语音模型 (Speech)", Icon: Mic, value: speechModel },
        { label: "声音 (Voice)", Icon: Music, value: voice },
      ].map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-2 rounded-lg border border-neutral-200/50 bg-white/60 p-3 transition-all duration-200 hover:bg-white/80 dark:border-neutral-700/30 dark:bg-black/30 dark:hover:bg-black/40"
        >
          <span className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <item.Icon size={14} />
            {item.label}
          </span>
          <div className="truncate font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
