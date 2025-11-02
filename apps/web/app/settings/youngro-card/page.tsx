"use client";

import { PageHeader } from "@repo/ui";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import React from "react";
import {
  YoungroCardProvider,
  useYoungroCards,
  type YoungroExtension,
} from "@youngro/store-card";
import { CreateCardTile } from "./components/CreateCardTile";
import { FileInput } from "./components/FileInput";
import { CardListItem } from "./components/CardListItem";
import { CardCreationDialog } from "./components/CardCreationDialog";
import { CardDetailDialog } from "./components/CardDetailDialog";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
// YoungroExtension type is now provided by the store package

function Content() {
  const router = useRouter();
  const { cards, activeCardId, addCard, removeCard, setActiveCard } =
    useYoungroCards();

  const entries = Object.entries(cards);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleImport = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      addCard(json);
    } catch (e) {
      console.error("Import card error", e);
      alert("导入失败：无效的 JSON 文件");
    }
  };

  const handleCreate = () => setCreateOpen(true);

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

        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          <FileInput onFiles={handleImport} />
          <CreateCardTile onClick={handleCreate} />

          {entries.length > 0 ? (
            entries.map(([id, card]) => {
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
                  consciousnessModel={y?.modules?.consciousness?.model}
                  voiceModel={y?.modules?.speech?.voice_id}
                  onSelect={() => {
                    setDetailId(id);
                  }}
                  onActivate={() => setActiveCard(id)}
                  onDelete={() => {
                    setDeleteId(id);
                  }}
                />
              );
            })
          ) : (
            <div className="col-span-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-8 text-center text-neutral-600 dark:border-neutral-700/30 dark:bg-neutral-900/50 dark:text-neutral-300">
              暂无卡片
            </div>
          )}
        </div>

        <CardCreationDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={(v) =>
            addCard({
              name: v.name,
              nickname: v.nickname,
              version: v.version || "1.0.0",
              description: v.description,
              notes: v.notes,
              personality: v.personality,
              scenario: v.scenario,
              greetings: v.greetings,
              systemPrompt: v.systemPrompt,
              postHistoryInstructions: v.postHistoryInstructions,
            })
          }
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
