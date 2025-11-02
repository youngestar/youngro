"use client";

import React from "react";

export function FileInput({ onFiles }: { onFiles: (files: FileList) => void }) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
  };
  return (
    <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-white/60 p-6 text-center transition-all hover:border-primary-300 hover:bg-white/80 dark:border-neutral-700 dark:bg-black/30 dark:hover:border-primary-700 dark:hover:bg-black/40">
      <div className="mb-2 text-5xl text-neutral-400 dark:text-neutral-500">
        ⤴
      </div>
      <p className="font-medium text-neutral-600 dark:text-neutral-300">
        导入卡片（.json）
      </p>
      <input
        type="file"
        accept=".json"
        className="hidden"
        onChange={onChange}
      />
    </label>
  );
}
