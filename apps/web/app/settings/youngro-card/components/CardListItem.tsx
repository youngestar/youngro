"use client";

import React from "react";
// import { Button } from "@repo/ui";
import { Ghost, Mic, CheckCircle2, PlayCircle, Trash2 } from "lucide-react";
import { IconButton } from "./IconButton";

interface Props {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSelected?: boolean;
  version: string;
  consciousnessModel?: string;
  voiceModel?: string;
  onSelect: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

export function CardListItem({
  id,
  name,
  description,
  isActive,
  isSelected,
  version,
  consciousnessModel,
  voiceModel,
  onSelect,
  onActivate,
  onDelete,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onClick={onSelect}
      className={
        "relative min-h-[120px] cursor-pointer overflow-hidden rounded-xl border-2 bg-neutral-200/50 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 hover:shadow md:hover:shadow-neutral-300 dark:border-neutral-800/25 dark:bg-neutral-800/50 " +
        (isSelected
          ? "border-primary-300 ring-2 ring-primary-300/50 dark:border-primary-700"
          : "border-neutral-100")
      }
    >
      <div className="flex h-full flex-col justify-between rounded-lg bg-white p-5 transition-all hover:text-primary-600/80 dark:bg-neutral-900 dark:hover:text-primary-300/80">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-lg font-normal">{name}</h3>
          {isActive ? (
            <div
              className="shrink-0 rounded-md bg-primary-100 p-1 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400"
              aria-label="已激活"
              title="已激活"
            >
              <CheckCircle2 className="h-4 w-4" />
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
                <Ghost className="h-3.5 w-3.5" aria-hidden />
                <span>{consciousnessModel}</span>
              </div>
            ) : null}
            {voiceModel ? (
              <div className="flex items-center gap-1">
                <Mic className="h-3.5 w-3.5" aria-hidden />
                <span>{voiceModel}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 px-2 py-1.5">
        <IconButton
          ariaLabel={isActive ? "已激活" : "激活"}
          title={isActive ? "已激活" : "激活"}
          disabled={isActive}
          onClick={onActivate}
        >
          {isActive ? (
            <CheckCircle2 className="h-5 w-5 text-primary-500 dark:text-primary-400" />
          ) : (
            <PlayCircle className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          )}
        </IconButton>
        {id !== "default" ? (
          <IconButton ariaLabel="删除" title="删除" onClick={onDelete}>
            <Trash2 className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
