"use client";

import React from "react";

export function FileInput({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [dragOver, setDragOver] = React.useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) onFiles(files);
  };

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  return (
    <label
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      className={
        "flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white/60 p-6 text-center transition-all dark:bg-black/30 " +
        (dragOver
          ? "border-primary-400 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-900/20"
          : "border-neutral-200 hover:border-primary-300 hover:bg-white/80 dark:border-neutral-700 dark:hover:border-primary-700 dark:hover:bg-black/40")
      }
      aria-label="拖拽或点击以导入 JSON"
    >
      <div
        className={
          "mb-2 text-5xl transition-colors " +
          (dragOver
            ? "text-primary-500 dark:text-primary-400"
            : "text-neutral-400 dark:text-neutral-500")
        }
      >
        ⤴
      </div>
      <p className="font-medium text-neutral-600 dark:text-neutral-300">
        {dragOver ? "释放以导入（.json）" : "导入卡片（.json）"}
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
