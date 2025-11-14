"use client";

import { PageHeader, Icon, Button } from "@repo/ui";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import React from "react";
import { SearchX } from "lucide-react";
import {
  YoungroCardProvider,
  useYoungroCards,
  type YoungroExtension,
  composeDescription,
  composeSystemPrompt,
  composePostHistoryInstructions,
  DEFAULT_POST_HISTORY_INSTRUCTIONS,
  parseImportedCard,
} from "@youngro/store-card";
import { CreateCardTile } from "./components/CreateCardTile";
import { FileInput } from "./components/FileInput";
import { CardListItem } from "./components/CardListItem";
import { CardCreationDialog } from "./components/CardCreationDialog";
import { CardDetailDialog } from "./components/CardDetailDialog";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { Toolbar } from "./components/Toolbar";
// YoungroExtension type is now provided by the store package

function Content() {
  const router = useRouter();
  const { cards, activeCardId, addCard, removeCard, setActiveCard } =
    useYoungroCards();

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<"nameAsc" | "nameDesc" | "recent">(
    "recent"
  );
  const entries = Object.entries(cards).filter(([, card]) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${card.name}\n${card.description ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
  const sorted = React.useMemo(() => {
    const arr = [...entries];
    if (sort === "nameAsc" || sort === "nameDesc") {
      arr.sort((a, b) => a[1].name.localeCompare(b[1].name, "zh-Hans-CN"));
      if (sort === "nameDesc") arr.reverse();
    } else if (sort === "recent") {
      // Object.entries preserves insertion order; reverse to show most recent first
      arr.reverse();
    }
    return arr;
  }, [entries, sort]);

  const hasQuery = search.trim().length > 0;
  const hasResults = sorted.length > 0;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleImport = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = parseImportedCard(json);
      addCard(parsed);
    } catch (e) {
      console.error("Import card error", e);
      const msg = e instanceof Error ? e.message : "无效的 JSON 文件";
      alert(`导入失败：\n${msg}`);
    }
  };

  const handleCreate = () => setCreateOpen(true);

  const downloadJson = (data: unknown, filename: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export JSON error", e);
      alert("导出失败");
    }
  };

  const handleExportActive = () => {
    const id = activeCardId;
    const card = cards[id];
    if (!card) return alert("没有可导出的当前卡片");
    const safeName = (card.name || id).replace(/[^\w-]+/g, "_");
    downloadJson(card, `youngro-card-${safeName}.json`);
  };

  const handleExportAll = () => {
    if (!Object.keys(cards).length) return alert("暂无卡片可导出");
    downloadJson(cards, "youngro-cards.json");
  };

  const handleExportCard = (id: string) => {
    const card = cards[id];
    if (!card) return alert("未找到该卡片");
    const safeName = (card.name || id).replace(/[^\w-]+/g, "_");
    downloadJson(card, `youngro-card-${safeName}.json`);
  };

  const selectedCard = detailId ? cards[detailId] : null;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          title="Youngro 卡片"
          subtitle="Youngro Card"
          showBackButton
          onBack={() => router.back()}
        />

        <div className="mt-3">
          <Toolbar
            onCreate={handleCreate}
            onImport={handleImport}
            onExportActive={handleExportActive}
            onExportAll={handleExportAll}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
          />
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] auto-rows-[minmax(120px,auto)] gap-4">
          <FileInput onFiles={handleImport} />
          <CreateCardTile onClick={handleCreate} />

          {hasResults &&
            sorted.map(([id, card]) => {
              const y = (card.extensions as { youngro: YoungroExtension })
                .youngro;
              return (
                <CardListItem
                  key={id}
                  id={id}
                  name={card.name}
                  description={card.description}
                  version={card.version}
                  isActive={id === activeCardId}
                  isSelected={id === detailId}
                  consciousnessModel={y?.modules?.consciousness?.model}
                  voiceModel={y?.modules?.speech?.voice_id}
                  onSelect={() => {
                    setDetailId(id);
                  }}
                  onActivate={() => setActiveCard(id)}
                  onExport={() => handleExportCard(id)}
                  onDelete={() => {
                    setDeleteId(id);
                  }}
                />
              );
            })}

          {hasQuery && !hasResults && (
            <div className="h-full min-h-[120px] rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-center text-neutral-600 dark:border-neutral-700/30 dark:bg-neutral-900/50 dark:text-neutral-300">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/60 text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <Icon icon={SearchX} size="sm" />
              </div>
              <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                无匹配结果
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                调整关键词，或清除搜索条件后重试
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={() => setSearch("")}>
                  清除搜索
                </Button>
              </div>
            </div>
          )}
        </div>

        {!hasQuery && !hasResults && (
          <div className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            暂无卡片
          </div>
        )}

        <CardCreationDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={(v) => {
            const description = composeDescription({
              name: v.name,
              personality: v.personality,
              scenario: v.scenario,
              description: v.description,
            });
            const systemPrompt = composeSystemPrompt({
              name: v.name,
              personality: v.personality,
              scenario: v.scenario,
              systemPrompt: v.systemPrompt,
            });
            const postHistoryInstructions = composePostHistoryInstructions(
              DEFAULT_POST_HISTORY_INSTRUCTIONS,
              v.postHistoryInstructions
            );

            addCard({
              name: v.name,
              nickname: v.nickname,
              version: v.version || "1.0.0",
              description,
              notes: v.notes,
              personality: v.personality,
              scenario: v.scenario,
              greetings: v.greetings,
              systemPrompt,
              postHistoryInstructions,
            });
          }}
        />

        <CardDetailDialog
          open={detailId != null}
          card={selectedCard ?? null}
          onClose={() => setDetailId(null)}
          onActivate={() => {
            if (detailId) setActiveCard(detailId);
            setDetailId(null);
          }}
          onDelete={() => {
            if (detailId) {
              setDeleteId(detailId);
              setDetailId(null);
            }
          }}
        />

        <DeleteConfirmDialog
          open={deleteId != null}
          name={deleteId ? (cards[deleteId]?.name ?? "") : ""}
          onClose={() => setDeleteId(null)}
          onConfirm={() => {
            if (deleteId) removeCard(deleteId);
            setDeleteId(null);
          }}
        />
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <YoungroCardProvider>
      <Content />
    </YoungroCardProvider>
  );
}
