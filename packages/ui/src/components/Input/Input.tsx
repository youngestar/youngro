"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const input = cva(
  "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm",
  {
    variants: {
      intent: {
        default:
          "border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400",
        destructive: "border-red-300 focus:ring-red-400",
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
