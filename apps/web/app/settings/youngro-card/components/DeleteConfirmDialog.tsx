"use client";

import React from "react";
import { Button } from "@repo/ui";
import { SimpleModal } from "./SimpleModal";

export function DeleteConfirmDialog({
  open,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title="删除卡片"
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={onClose} intent="default">
            取消
          </Button>
          <Button onClick={onConfirm} intent="destructive">
            删除
          </Button>
        </div>
      }
      widthClassName="max-w-md"
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        确认删除卡片 “{name}” 吗？该操作不可撤销。
      </p>
    </SimpleModal>
  );
}
