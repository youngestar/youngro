"use client";

import React from "react";
import clsx from "clsx";

export interface RadioCardProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Optional footer content, e.g. badges or status text
   */
  footer?: React.ReactNode;
  variant?: "default" | "compact";
}

export const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  (
    {
      className,
      label,
      description,
      icon: Icon,
      footer,
      checked,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const isCompact = variant === "compact";

    return (
      <label
        className={clsx(
          "relative flex cursor-pointer flex-col items-start rounded-xl border text-left transition-all duration-200 ease-in-out",
          isCompact ? "p-3" : "min-w-[12rem] p-4",
          checked
            ? "border-primary-100 bg-primary-50 ring-2 ring-primary-500/30 dark:border-primary-900 dark:bg-primary-900/20"
            : "border-neutral-100 bg-white hover:border-primary-500/30 dark:border-neutral-900 dark:bg-neutral-900/20 dark:hover:border-primary-400/30",
          className
        )}
      >
        <input
          type="radio"
          className="peer sr-only"
          ref={ref}
          checked={checked}
          {...props}
        />

        {/* Radio Indicator (Circle + Dot) */}
        <div
          className={clsx(
            "absolute rounded-full border-2 border-neutral-300 transition-all duration-200 ease-in-out dark:border-neutral-600 peer-checked:border-primary-500 dark:peer-checked:border-primary-400",
            isCompact ? "left-3 top-3 h-4 w-4" : "left-3 top-3 h-5 w-5"
          )}
        >
          <div
            className={clsx(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500 transition-all duration-200 ease-in-out dark:bg-primary-400",
              isCompact ? "h-2 w-2" : "h-2.5 w-2.5",
              checked ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        {/* Background pattern effect similar to airi */}
        <div
          className={clsx(
            "absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:10px_10px] opacity-0 transition-opacity duration-300 dark:bg-[radial-gradient(#262626_1px,transparent_1px)]",
            checked ? "opacity-100" : "opacity-0"
          )}
          style={{
            maskImage: "linear-gradient(165deg, white 30%, transparent 80%)",
            WebkitMaskImage:
              "linear-gradient(165deg, white 30%, transparent 80%)",
          }}
        />

        <div
          className={clsx(
            "flex w-full flex-col",
            isCompact ? "pl-6" : "pl-6 pt-1"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={clsx(
                "font-medium transition-colors duration-200",
                isCompact ? "text-sm" : "text-base",
                checked
                  ? "text-neutral-900 dark:text-neutral-50"
                  : "text-neutral-500 dark:text-neutral-500"
              )}
            >
              {label}
            </span>
            {Icon && (
              <Icon
                className={clsx(
                  "transition-opacity",
                  isCompact ? "h-4 w-4" : "h-5 w-5",
                  checked ? "opacity-100 text-primary-500" : "opacity-40"
                )}
              />
            )}
          </div>
          {description && (
            <span
              className={clsx(
                "mt-1 transition-colors duration-200",
                isCompact ? "text-xs line-clamp-1" : "text-sm",
                checked
                  ? "text-neutral-600 dark:text-neutral-400"
                  : "text-neutral-400 dark:text-neutral-600"
              )}
            >
              {description}
            </span>
          )}
        </div>

        {footer && (
          <div className={clsx("mt-3 w-full", isCompact ? "pl-6" : "pl-6")}>
            {footer}
          </div>
        )}
      </label>
    );
  }
);

RadioCard.displayName = "RadioCard";
