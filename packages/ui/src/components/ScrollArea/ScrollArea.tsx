"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import clsx from "clsx";

export type ScrollAreaProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> & {
  variant?: "default" | "contrast" | "textarea";
  thickness?: "sm" | "md" | "lg";
  viewportClassName?: string;
  scrollbarClassName?: string;
  thumbClassName?: string;
};

/**
 * ScrollArea
 *
 * A thin wrapper around @radix-ui/react-scroll-area following the same
 * patterns as other UI components in this package (forwardRef + clsx).
 * Default styles are aligned with shadcn/ui, using design tokens where possible.
 */
export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      viewportClassName,
      scrollbarClassName,
      thumbClassName,
      variant = "default",
      thickness = "md",
      children,
      ...props
    },
    ref
  ) => {
    const isContrast = variant === "contrast";
    const isTextareaTone = variant === "textarea";
    const thicknessClsVertical =
      thickness === "lg" ? "w-3" : thickness === "sm" ? "w-2" : "w-2.5"; // md default ≈ 10px
    const thicknessClsHorizontal =
      thickness === "lg" ? "h-3" : thickness === "sm" ? "h-2" : "h-2.5";
    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={clsx("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          className={clsx("h-full w-full rounded-[inherit]", viewportClassName)}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
          orientation="vertical"
          className={clsx(
            "flex select-none touch-none p-0.5 transition-colors",
            thicknessClsVertical,
            isContrast
              ? "bg-neutral-200/60 dark:bg-neutral-800/60 hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80"
              : isTextareaTone
                ? "bg-neutral-200/40 dark:bg-neutral-800/40 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                : undefined,
            scrollbarClassName
          )}
        >
          <ScrollAreaPrimitive.Thumb
            className={clsx(
              "relative flex-1 rounded-full shadow-sm",
              isContrast
                ? "bg-neutral-500/70 dark:bg-neutral-400/70 hover:bg-neutral-600/80 dark:hover:bg-neutral-300/80"
                : isTextareaTone
                  ? "bg-neutral-300/80 dark:bg-neutral-600/80 hover:bg-neutral-400/90 dark:hover:bg-neutral-500/90"
                  : "bg-border",
              thumbClassName
            )}
          />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Scrollbar
          orientation="horizontal"
          className={clsx(
            "flex select-none touch-none p-0.5 transition-colors",
            thicknessClsHorizontal,
            isContrast
              ? "bg-neutral-200/60 dark:bg-neutral-800/60 hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80"
              : isTextareaTone
                ? "bg-neutral-200/40 dark:bg-neutral-800/40 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                : undefined,
            scrollbarClassName
          )}
        >
          <ScrollAreaPrimitive.Thumb
            className={clsx(
              "relative flex-1 rounded-full shadow-sm",
              isContrast
                ? "bg-neutral-500/70 dark:bg-neutral-400/70 hover:bg-neutral-600/80 dark:hover:bg-neutral-300/80"
                : isTextareaTone
                  ? "bg-neutral-300/80 dark:bg-neutral-600/80 hover:bg-neutral-400/90 dark:hover:bg-neutral-500/90"
                  : "bg-border",
              thumbClassName
            )}
          />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    );
  }
);
ScrollArea.displayName = "ScrollArea";

export default ScrollArea;
