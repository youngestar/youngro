"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { Icon } from "../Icon";
import clsx from "clsx";
import { cva, type VariantProps } from "class-variance-authority";

export interface HeadlessSelectOption {
  value: string;
  label: React.ReactNode;
}

export interface HeadlessSelectProps {
  options: HeadlessSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  /** style size for trigger & items */
  size?: "sm" | "md" | "lg";
  /** visual tone for trigger */
  tone?: "plain" | "tinted";
  /** placeholder to render in trigger when no value selected */
  placeholder?: React.ReactNode;
  /** disable the select */
  disabled?: boolean;
  /** expand trigger to full width */
  fullWidth?: boolean;
  /** additional classNames for slots */
  triggerClassName?: string;
  contentClassName?: string;
  viewportClassName?: string;
  itemClassName?: string;
  /** positioning props forwarded to Radix content */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

const trigger = cva(
  [
    "inline-flex items-center justify-between rounded-md border shadow-sm",
    // focus and transitions
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60",
    "transition-colors duration-200 ease-in-out",
    // disabled state
    "disabled:opacity-50 disabled:pointer-events-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-sm h-8",
        md: "px-3 py-2 text-sm h-10",
        lg: "px-4 py-2 text-base h-12",
      },
      tone: {
        plain:
          "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700",
        tinted:
          "bg-primary-200/20 dark:bg-primary-400/20 text-primary-600 dark:text-primary-300/70 border-transparent",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "plain",
    },
  },
);

// Use a z-index higher than the sticky PageHeader (which is z-[99]) so the
// dropdown is not covered by the header's backdrop-blur overlay.
// Make content follow trigger width using Radix CSS vars.
const content = cva(
  [
    "z-[999] rounded-md border bg-white dark:bg-neutral-900 p-1 shadow-lg",
    "border-neutral-200 dark:border-neutral-700",
    "min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-content-available-width)]",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const item = cva(
  [
    "flex items-center gap-2 px-2 py-1 rounded-md outline-none",
    "cursor-pointer",
    // highlight / selected / disabled
    "data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800",
    "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
    "data-[state=checked]:font-medium",
    "transition-colors duration-200 ease-in-out",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type HeadlessSelectVariantProps = VariantProps<typeof trigger>;

export const HeadlessSelect: React.FC<
  HeadlessSelectProps & HeadlessSelectVariantProps
> = ({
  options,
  value,
  onValueChange,
  className,
  size = "md",
  tone = "plain",
  placeholder,
  disabled,
  fullWidth,
  triggerClassName,
  contentClassName,
  viewportClassName,
  itemClassName,
  side = "bottom",
  align = "center",
  sideOffset = 6,
}) => {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        disabled={disabled}
        className={clsx(
          trigger({ size, tone }),
          fullWidth && "w-full",
          className,
          triggerClassName,
        )}
        aria-label="Select"
      >
        <RadixSelect.Value placeholder={placeholder} />
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={clsx(content({ size }), contentClassName)}
        >
          <RadixSelect.Viewport
            className={clsx("overflow-auto max-h-60", viewportClassName)}
          >
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className={clsx(item({ size }), itemClassName)}
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto">
                  <Icon icon={Check} size="sm" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
};

export default HeadlessSelect;
