"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const textarea = cva("w-full rounded-md border px-3 py-2 text-sm shadow-sm", {
  variants: {
    intent: {
      default:
        "border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400",
      destructive: "border-red-300 focus:ring-red-400",
    },
    size: {
      sm: "text-sm",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    intent: "default",
    size: "md",
  },
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textarea>;

export const Textarea: React.FC<TextareaProps> = ({
  className,
  intent,
  size,
  ...props
}) => {
  return (
    <textarea
      {...props}
      className={clsx(textarea({ intent, size }), className)}
    />
  );
};

export default Textarea;
