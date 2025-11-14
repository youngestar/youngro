"use client";

import React from "react";
// import { Button } from "@repo/ui";
import {
  Ghost,
  Mic,
  CheckCircle2,
  PlayCircle,
  Trash2,
  Download,
} from "lucide-react";
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
  onExport: () => void;
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
  onExport,
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
        // Outer container mimicking AIRI: group, overlay gradient, subtle hover shadow
        "group relative flex min-h-[120px] cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-neutral-200/50 transition-all duration-400 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 hover:shadow-[0_4px_4px_rgba(220,220,220,0.4)] active:shadow-[0_0_0_rgba(220,220,220,0.25)] dark:border-neutral-800/25 dark:bg-neutral-800/50 " +
        // Selection state prefers border tint like AIRI
        (isSelected
          ? "border-primary-400 dark:border-primary-600"
          : "border-neutral-100") +
        // Gradient sweep overlay on hover (before pseudo)
        " before:content-[''] before:absolute before:inset-0 before:z-0 before:h-full before:w-1/4 before:opacity-0 before:transition-all before:duration-400 before:ease-in-out before:bg-gradient-to-r before:from-primary-500/0 before:to-primary-500/0 group-hover:before:opacity-100 group-hover:before:from-primary-500/20 group-hover:before:via-primary-500/10 group-hover:before:to-transparent dark:before:from-primary-400/0 dark:before:to-primary-400/0 dark:group-hover:before:from-primary-400/20 dark:group-hover:before:via-primary-400/10 dark:group-hover:before:to-transparent"
      }
    >
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col justify-between gap-3 overflow-hidden rounded-lg bg-white p-5 transition-colors dark:bg-neutral-900 group-hover:text-primary-600/80 dark:group-hover:text-primary-300/80 after:content-[''] after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(circle_at_1px_1px,_rgba(226,232,240,0.8)_1px,_transparent_0)] after:[background-size:10px_10px] after:[mask-image:linear-gradient(165deg,white_30%,transparent_50%)] group-hover:after:bg-[radial-gradient(circle_at_1px_1px,_rgba(147,197,253,0.5)_1px,_transparent_0)] dark:group-hover:after:bg-[radial-gradient(circle_at_1px_1px,_rgba(191,219,254,0.2)_1px,_transparent_0)]">
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
          <p className="min-h-[40px] flex-1 break-words text-sm text-neutral-500 line-clamp-3 dark:text-neutral-400">
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
      {/* Actions outside inner panel, like AIRI */}
      <div className="flex items-center justify-end gap-1.5 px-2 py-1.5">
        <IconButton ariaLabel="导出" title="导出" onClick={onExport}>
          <Download className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
        </IconButton>
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
