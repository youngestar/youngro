"use client";

import React from "react";

export function CreateCardTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[120px] w-full rounded-xl border-2 border-neutral-200 bg-white/60 p-6 overflow-hidden transition-colors hover:border-primary-300 hover:bg-white/80 dark:border-neutral-700 dark:bg-black/30 dark:hover:border-primary-700 dark:hover:bg-black/40"
    >
      <div className="transition-transform duration-200 will-change-transform transform-gpu group-hover:scale-[1.01]">
        <div className="mb-4 text-5xl text-neutral-400 dark:text-neutral-500">
          ＋
        </div>
        <p className="font-medium text-neutral-600 dark:text-neutral-300">
          新建卡片
        </p>
      </div>
    </button>
  );
}
