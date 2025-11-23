"use client";

import * as React from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import "./IconStatusItem.css";

export interface IconStatusItemProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  title: string;
  description?: string;
  /** Component or element for the floating right icon */
  icon?: React.ReactNode;
  /** Utility classes to color/tint the floating icon wrapper (optional) */
  iconColorClassName?: string;
  /** Image URL alternative to icon component */
  iconImageSrc?: string;
  /** Configured state – renders a status dot below the card */
  configured?: boolean;
  /** Show legacy badge text instead of dot (default false mimics AIRI) */
  legacyBadge?: boolean;
}

/**
 * IconStatusItem
 * - Clickable card used in settings/modules grid to highlight a module entry.
 * - Shows icon, title, description, and optional configured badge.
 */
export const IconStatusItem = React.forwardRef<
  HTMLAnchorElement,
  IconStatusItemProps
>(
  (
    {
      title,
      description,
      icon,
      iconColorClassName,
      iconImageSrc,
      configured = false,
      legacyBadge = false,
      className,
      ...rest
    },
    ref
  ) => {
    const iconNode = iconImageSrc ? (
      <img
        alt=""
        src={iconImageSrc}
        className={clsx(
          "ui-icon-status-item-icon-image text-neutral-400/50 dark:text-neutral-600/50 group-hover:text-primary-500 dark:group-hover:text-primary-400",
          iconColorClassName
        )}
      />
    ) : icon ? (
      <div
        className={clsx(
          "ui-icon-status-item-icon text-neutral-400/50 dark:text-neutral-600/50 group-hover:text-primary-500 dark:group-hover:text-primary-400",
          iconColorClassName
        )}
      >
        {icon}
      </div>
    ) : null;

    return (
      <a
        ref={ref}
        className={clsx(
          "ui-icon-status-item group flex flex-col rounded-xl border-2 bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-800/25 hover:border-primary-500/30 dark:hover:border-primary-400/30 drop-shadow-none hover:shadow-sm active:shadow-none dark:hover:shadow-none transition-all duration-400",
          className
        )}
        {...rest}
      >
        <div
          className={clsx(
            "ui-icon-status-item-link relative flex w-full h-full items-center overflow-hidden rounded-lg p-5 text-left bg-white dark:bg-neutral-900 transition-all duration-400 text-neutral-200/80 dark:text-neutral-700/40 group-hover:text-primary-300/50 dark:group-hover:text-primary-200/20"
          )}
        >
          <div className="z-10 flex-1">
            <div className="ui-icon-status-item-title text-neutral-800 text-lg font-normal transition-all duration-400">
              {title}
            </div>
            <div className="ui-icon-status-item-description text-sm text-neutral-500 dark:text-neutral-400 transition-all duration-400">
              {description || ""}
            </div>
          </div>
          {iconNode}
        </div>
        <div className="p-2">
          {legacyBadge ? (
            configured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> 已配置
              </span>
            ) : null
          ) : configured ? (
            <div
              className={clsx(
                "ui-icon-status-item-configured-dot bg-emerald-500 ring-4 ring-emerald-500/25 group-hover:scale-105"
              )}
            />
          ) : (
            <div
              className={clsx(
                "ui-icon-status-item-configured-dot border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              )}
            />
          )}
        </div>
      </a>
    );
  }
);

IconStatusItem.displayName = "IconStatusItem";

export default IconStatusItem;
