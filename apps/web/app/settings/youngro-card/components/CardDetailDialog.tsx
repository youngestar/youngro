"use client";

import React from "react";
import { Button } from "@repo/ui";
import { SimpleModal } from "./SimpleModal";
import type { YoungroCard } from "@youngro/store-card";
import { CardDetailsPanel } from "@youngro/feature-youngro-card";

export function CardDetailDialog({
  open,
  card,
  onClose,
  onActivate,
  onDelete,
}: {
  open: boolean;
  card: YoungroCard | null;
  onClose: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = React.useState<"details" | "modules">("details");
  React.useEffect(() => {
    if (open) setTab("details");
  }, [open]);

  if (!card) return null;

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title={`${card.name} · v${card.version}`}
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={onDelete} intent="destructive">
            删除
          </Button>
          <Button onClick={onActivate}>激活</Button>
        </div>
      }
      widthClassName="max-w-2xl"
    >
      <CardDetailsPanel card={card} tab={tab} onChangeTab={setTab} />
    </SimpleModal>
  );
}
