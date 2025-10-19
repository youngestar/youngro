"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
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
  size?: "sm" | "md" | "lg";
}

const trigger = cva(
  "inline-flex items-center justify-between rounded-md border shadow-sm",
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-sm h-8",
        md: "px-3 py-2 text-sm h-10",
        lg: "px-4 py-2 text-base h-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const content = cva("z-50 rounded-md border bg-white p-1 shadow-lg", {
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
});

const item = cva("flex items-center gap-2 px-2 py-1 rounded-md outline-none", {
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
});

export type HeadlessSelectVariantProps = VariantProps<typeof trigger>;

export const HeadlessSelect: React.FC<
  HeadlessSelectProps & HeadlessSelectVariantProps
> = ({ options, value, onValueChange, className, size = "md" }) => {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        className={clsx(trigger({ size }), className)}
        aria-label="Select"
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown className="ml-2 h-4 w-4" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className={content({ size })}>
          <RadixSelect.Viewport>
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className={item({ size })}
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto">
                  <Check className="h-4 w-4" />
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
