"use client";

import * as React from "react";
import clsx from "clsx";
import { Icon } from "../Icon";
import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  showBackButton?: boolean;
  disableBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

/**
 * PageHeader
 * - Sticky header with optional back button, subtitle and title.
 * - No routing dependency: use `onBack` to define behavior.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  disableBackButton = false,
  onBack,
  className,
}) => {
  return (
    <div
      style={{
        top: "env(safe-area-inset-top, 0px)",
        right: "env(safe-area-inset-right, 0px)",
        left: "env(safe-area-inset-left, 0px)",
      }}
      className={clsx(
        "sticky inset-x-0 top-0 z-1 w-full bg-background/80 backdrop-blur pb-6 pt-10",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {showBackButton && !disableBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors",
              { "pointer-events-none opacity-0": !showBackButton },
            )}
            aria-label="Back"
          >
            <Icon icon={ArrowLeft} />
          </button>
        ) : (
          <div className="h-8 w-8" />
        )}

        <h1 className="relative">
          {subtitle ? (
            <div className="absolute left-0 top-0 -translate-y-full text-nowrap text-sm text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
          <div className="text-nowrap text-2xl md:text-3xl font-normal">
            {title}
          </div>
        </h1>
      </div>
    </div>
  );
};

export default PageHeader;
