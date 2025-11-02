"use client";

import React from "react";
import { Button } from "@repo/ui";

interface Props {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  version: string;
  consciousnessModel?: string;
  voiceModel?: string;
  onSelect: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

export function CardListItem({
  name,
  description,
  isActive,
  version,
  consciousnessModel,
  voiceModel,
  onSelect,
  onActivate,
  onDelete,
}: Props) {
  return (
    <div
      onClick={onSelect}
      className="relative min-h-[120px] cursor-pointer overflow-hidden rounded-xl border-2 border-neutral-100 bg-neutral-200/50 transition-all hover:shadow md:hover:shadow-neutral-300 dark:border-neutral-800/25 dark:bg-neutral-800/50"
    >
      <div className="flex h-full flex-col justify-between rounded-lg bg-white p-5 transition-all hover:text-primary-600/80 dark:bg-neutral-900 dark:hover:text-primary-300/80">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-lg font-normal">{name}</h3>
          {isActive ? (
            <div className="shrink-0 rounded-md bg-primary-100 p-1 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
              ✔
            </div>
          ) : null}
        </div>

        {description ? (
          <p className="min-h-[40px] flex-1 text-sm text-neutral-500 line-clamp-3 dark:text-neutral-400">
            {description}
          </p>
        ) : (
          <div className="min-h-[40px]" />
        )}

        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div>v{version}</div>
          <div className="flex items-center gap-2">
            {consciousnessModel ? (
              <div className="flex items-center gap-1">
                <span>👻</span>
                <span>{consciousnessModel}</span>
              </div>
            ) : null}
            {voiceModel ? (
              <div className="flex items-center gap-1">
                <span>🎙️</span>
                <span>{voiceModel}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-2 py-1.5">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
          disabled={isActive}
        >
          {isActive ? "已激活" : "激活"}
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          intent="destructive"
        >
          删除
        </Button>
      </div>
    </div>
  );
}
