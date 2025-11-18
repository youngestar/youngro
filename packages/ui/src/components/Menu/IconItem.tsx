"use client";

import * as React from "react";
import clsx from "clsx";

export interface IconItemProps {
  title: string;
  description: string;
  to: string;
  /**
   * Utility class for the right-side big icon (e.g. from an icon font).
   * Example: "i-solar:settings-bold-duotone" if your app supports it.
   */
  icon?: string;
  /**
   * When true, render children as the right-side icon/template instead of using `icon` class.
   */
  iconTemplate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A navigational item styled like a clickable card.
 * Parity with AIRI's IconItem (Vue) but implemented in React + Tailwind.
 */
export function IconItem({
  title,
  description,
  to,
  icon,
  iconTemplate,
  className,
  children,
}: IconItemProps) {
  return (
    <a
      href={to}
      className={clsx(
        "menu-icon-item group relative flex w-full cursor-pointer items-center overflow-hidden rounded-lg p-5 text-left transition-all duration-400",
        // background and borders
        "bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800/25",
        // hover border glow/parity
        "hover:border-primary-500/30 dark:hover:border-primary-400/30",
        className,
      )}
    >
      {/* Content */}
      <div className="z-[1] flex-1">
        <div
          className={clsx(
            "menu-icon-item-title text-lg font-normal transition-all duration-400",
            // hover color
            "group-hover:text-primary-600 dark:group-hover:text-primary-300",
          )}
        >
          {title}
        </div>
        <div
          className={clsx(
            "menu-icon-item-description text-sm text-neutral-500 dark:text-neutral-400 transition-all duration-400",
            // hover color + slight emphasis
            "group-hover:text-primary-600 dark:group-hover:text-primary-300 group-hover:opacity-80",
          )}
        >
          <span>{description}</span>
        </div>
      </div>

      {/* Right-side large icon */}
      {icon && !iconTemplate ? (
        <div
          className={clsx(
            "menu-icon-item-icon absolute right-0 h-24 w-24 translate-y-4 text-neutral-400/50 transition-all duration-400 dark:text-neutral-600/50",
            // hover scale + color
            "group-hover:scale-110 group-hover:text-primary-500 dark:group-hover:text-primary-400",
            icon,
          )}
        />
      ) : null}

      {iconTemplate ? (
        <div
          className={clsx(
            "menu-icon-item-icon absolute right-0 h-24 w-24 translate-y-4 text-neutral-400/50 transition-all duration-400 dark:text-neutral-600/50",
            "group-hover:scale-110 group-hover:text-primary-500 dark:group-hover:text-primary-400",
          )}
        >
          {children}
        </div>
      ) : null}

      {/* Subtle gradient sweep on hover (approximation of AIRI effect) */}
      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-0 -z-10 h-full w-1/4 opacity-0 transition-all duration-300",
          "bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent",
          "dark:from-primary-400/20 dark:via-primary-400/10 dark:to-transparent",
          "group-hover:w-[85%] group-hover:opacity-100",
        )}
      />
    </a>
  );
}
