"use client";

import React from "react";
import { Button } from "@repo/ui";

interface SimpleModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string; // e.g. max-w-lg
}

export function SimpleModal({
  open,
  title,
  onClose,
  children,
  footer,
  widthClassName = "max-w-xl",
}: SimpleModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`w-full ${widthClassName} overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-4 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          {footer ?? (
            <Button onClick={onClose} intent="default">
              关闭
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
