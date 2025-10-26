"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const input = cva(
  // Align with chat style: tinted primary background + primary foreground, dark-mode aware
  "flex h-10 w-full rounded-md px-3 py-2 text-sm font-medium outline-none bg-primary-200/20 dark:bg-primary-400/20 text-primary-500 placeholder-primary-400 dark:text-primary-300/50 dark:placeholder-primary-300/50",
  {
    variants: {
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
      intent: "default",
      size: "md",
    },
  }
);

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof input>;

export const Input: React.FC<InputProps> = ({
  className,
  intent,
  size,
  ...props
}) => {
  return (
    <input {...props} className={clsx(input({ intent, size }), className)} />
  );
};

export default Input;
