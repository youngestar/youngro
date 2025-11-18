"use client";

import React from "react";
import clsx from "clsx";

interface IconButtonProps {
  ariaLabel: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  stopPropagation?: boolean;
}

export function IconButton({
  ariaLabel,
  title,
  onClick,
  disabled,
  className,
  children,
  stopPropagation = true,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        if (disabled) return;
        onClick?.(e);
      }}
      className={clsx(
        "rounded-lg p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
        "hover:bg-neutral-200 dark:hover:bg-neutral-700/50",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}
