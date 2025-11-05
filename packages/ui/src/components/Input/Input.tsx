"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const input = cva(
  // Base structural styles; visual tone controlled by variants
  "flex h-10 w-full rounded-md px-3 py-2 text-sm font-medium outline-none",
  {
    variants: {
      tone: {
        // Brand-tinted background (default, used by ai-chat)
        tinted:
          "bg-primary-200/20 dark:bg-primary-400/20 text-primary-600 placeholder-primary-400 dark:text-primary-300/70 dark:placeholder-primary-300/50 focus-visible:ring-2 focus-visible:ring-primary-400/60",
        // Traditional neutral input (used by settings/youngro-card etc.)
        plain:
          "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-neutral-200 dark:border-neutral-700 focus-visible:ring-2 focus-visible:ring-primary-400/60",
      },
      intent: {
        default: "focus-visible:ring-2 focus-visible:ring-primary-400/60",
        destructive:
          "focus-visible:ring-2 focus-visible:ring-red-400/70 ring-offset-0",
      },
      size: {
        sm: "h-8 text-sm",
        md: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      tone: "tinted",
      intent: "default",
      size: "md",
    },
  }
);

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof input>;

export const Input: React.FC<InputProps> = ({
  className,
  tone,
  intent,
  size,
  ...props
}) => {
  return (
    <input
      {...props}
      className={clsx(input({ tone, intent, size }), className)}
    />
  );
};

export default Input;
